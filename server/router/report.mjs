import { Router } from "express";
import { check } from "express-validator";
import {
  insertReport,
  getAllReports,
  updateReportStatus,
  setOperatorByReport,
  setMainteinerByReport,
  getAllApprovedReports,
  getReportsAssigned,
  addInternalComment,
  getInternalComments,
  addMessage,
  getMessages,
  autoAssignMaintainer,
  autoAssignTechnicalOfficer,
  createNotification,
  addSystemMessage,
  getReportParticipants,
} from "../dao.mjs";
import { getIO } from "../socket.mjs";

const router = Router();

// Status change messages for notifications
const STATUS_MESSAGES = {
  2: "Your report has been assigned to a technical officer",
  3: "Work on your report is now in progress",
  4: "Your report has been temporarily suspended",
  5: "Your report was rejected",
  6: "Great news! Your report has been resolved!",
};

// POST /reports
router.post(
  "/reports",
  [
    check("title")
      .exists({ checkFalsy: true })
      .withMessage("Title is required")
      .isLength({ min: 3 })
      .withMessage("Title must be at least 3 characters long"),
    check("description")
      .exists({ checkFalsy: true })
      .withMessage("Description is required")
      .isLength({ min: 10 })
      .withMessage("Description must be at least 10 characters long"),
    check("image_urls")
      .isArray({ min: 1, max: 3 })
      .withMessage("You must provide between 1 and 3 images"),
    check("latitude")
      .exists()
      .withMessage("Latitude is required")
      .isFloat()
      .withMessage("Latitude must be a number"),
    check("longitude")
      .exists()
      .withMessage("Longitude is required")
      .isFloat()
      .withMessage("Longitude must be a number"),
    check("category_id")
      .exists()
      .withMessage("Category ID is required")
      .isInt()
      .withMessage("Category ID must be an integer"),
    check("anonymous")
      .exists()
      .withMessage("Anonymous is required")
      .isBoolean()
      .withMessage("Anonymous must be boolean"),
  ],
  async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "user") {
      return res.status(401).json({ error: "Not authenticated or forbidden" });
    }

    try {
      const {
        title,
        description,
        image_urls,
        latitude,
        longitude,
        category_id,
        anonymous,
      } = req.body;
      const report = await insertReport({
        title,
        citizen_id: req.user.id,
        description,
        image_urls,
        latitude,
        longitude,
        category_id,
        anonymous,
      });
      return res.status(201).json(report);
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
  }
);

// GET /reports -> all reports all statuses (requires rel.officer/admin)
router.get("/reports", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (
      req.user.role !== "Admin" &&
      req.user.role !== "Municipal public relations officer"
    )
      return res.status(403).json({ error: "Forbidden" });

    const reports = await getAllReports();
    return res.status(200).json(reports);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during report retrieval" });
  }
});

// PUT /reports/:id/status -> update status of a report
router.put("/reports/:id/status", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (req.user.role === "user" || req.user.role === "Municipal administrator")
      return res.status(403).json({ error: "Forbidden" });

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(423).json({ error: "Invalid report id" });

    const { status_id, rejection_reason } = req.body;
    if (typeof status_id !== "number")
      return res.status(422).json({ error: "status_id must be a number" });

    const updated = await updateReportStatus(
      reportId,
      status_id,
      rejection_reason || null
    );
    if (!updated) return res.status(404).json({ error: "Report not found" });

    // Send notification to citizen on status change and add system message to chat
    if (updated.citizen?.id && STATUS_MESSAGES[status_id]) {
      let message = STATUS_MESSAGES[status_id];
      if (status_id === 5 && rejection_reason) {
        message = `Your report was rejected: ${rejection_reason}`;
      }
      await createNotification(updated.citizen.id, reportId, message, getIO());
      
      // Add system message to chat (for status updates visible in chat history)
      const systemMessage = await addSystemMessage(reportId, `📋 ${message}`);
      
      // Emit system message via WebSocket to report room and citizen room
      const io = getIO();
      if (io) {
        const sysMessagePayload = {
          id: systemMessage.message_id,
          report_id: systemMessage.report_id,
          sender_type: systemMessage.sender_type,
          sender_id: systemMessage.sender_id,
          content: systemMessage.content,
          sent_at: systemMessage.sent_at,
        };

        // Emit to report room
        io.to(`report:${reportId}`).emit("new_message", sysMessagePayload);

        // Emit to citizen room for badge update
        io.to(`citizen:${updated.citizen.id}`).emit("new_message", sysMessagePayload);
      }
    }

    return res.status(200).json(updated);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during status update" });
  }
});

// PUT /reports/:id/operator -> set operator for a report (requires rel.officer/admin)
router.put("/reports/:id/operator", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (
      req.user.role !== "Municipal public relations officer" &&
      req.user.role !== "Admin"
    )
      return res.status(403).json({ error: "Forbidden" });
    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(423).json({ error: "Invalid report id" });
    const { operatorId } = req.body;
    if (typeof operatorId !== "number")
      return res.status(422).json({ error: "operatorId must be a number" });
    const updated = await setOperatorByReport(reportId, operatorId);
    if (!updated) return res.status(404).json({ error: "Report not found" });
    return res.sendStatus(200);
  } catch (err) {
    res.status(503).json({ error: "Database error during operator assignment" });
  }
});

// POST /api/reports/:id/auto-assign-officer -> Auto-assign technical officer
router.post("/reports/:id/auto-assign-officer", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    if (
      req.user.role !== "Municipal public relations officer" &&
      req.user.role !== "Admin"
    )
      return res.status(403).json({ error: "Forbidden" });

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const result = await autoAssignTechnicalOfficer(reportId);

    return res.status(200).json({
      id: result.assigned_officer.operator_id,
      username: result.assigned_officer.username,
      email: result.assigned_officer.email,
    });
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during officer assignment" });
  }
});

// PUT /reports/:id/mainteiner -> set mainteiner for a report (requires tec.officer/admin)
router.put("/reports/:id/mainteiner", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (
      req.user.role !== "Technical office staff member" &&
      req.user.role !== "Admin"
    )
      return res.status(403).json({ error: "Forbidden" });
    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(423).json({ error: "Invalid report id" });

    const { operatorId } = req.body;
    if (typeof operatorId !== "number")
      return res.status(422).json({ error: "operatorId must be a number" });
    const updated = await setMainteinerByReport(reportId, operatorId);
    if (!updated) return res.status(404).json({ error: "Report not found" });
    return res.sendStatus(200);
  } catch (err) {
    res.status(503).json({ error: "Database error during operator assignment" });
  }
});

// POST /api/reports/:id/auto-assign-maintainer -> Auto-assign maintainer
router.post("/reports/:id/auto-assign-maintainer", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    if (
      req.user.role !== "Technical office staff member" &&
      req.user.role !== "Admin"
    )
      return res.status(403).json({ error: "Forbidden" });

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const result = await autoAssignMaintainer(reportId);

    return res.status(200).json({
      id: result.assigned_maintainer.operator_id,
      username: result.assigned_maintainer.username,
      company: result.assigned_maintainer.company_name,
    });
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during maintainer assignment" });
  }
});

// GET /reports/approved -> approved reports for map
router.get("/reports/approved", async (req, res) => {
  try {
    const reports = await getAllApprovedReports();
    return res.status(200).json(reports);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during report retrieval" });
  }
});

// GET /reports/assigned -> reports assigned to logged-in technical staff
router.get("/reports/assigned", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (
      req.user.role !== "Technical office staff member" &&
      req.user.role !== "External maintainer"
    )
      return res.status(403).json({ error: "Forbidden" });

    const operatorId = req.user.id;
    const reports = await getReportsAssigned(operatorId);
    return res.status(200).json(reports);
  } catch (err) {
    res
      .status(503)
      .json({ error: "Database error during assigned report retrieval" });
  }
});

// POST /reports/:id/internal-comments (operators only)
router.post("/reports/:id/internal-comments", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    if (
      req.user.role !== "Technical office staff member" &&
      req.user.role !== "External maintainer"
    ) {
      return res.status(403).json({ error: "Forbidden - operators only" });
    }

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(422).json({ error: "Content is required" });
    }

    const comment = await addInternalComment(
      reportId,
      req.user.id,
      content.trim()
    );
    return res.status(201).json(comment);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during comment creation" });
  }
});

// GET /reports/:id/internal-comments (operators only)
router.get("/reports/:id/internal-comments", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    if (
      req.user.role !== "Technical office staff member" &&
      req.user.role !== "External maintainer"
    ) {
      return res.status(403).json({ error: "Forbidden - operators only" });
    }

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const comments = await getInternalComments(reportId);
    return res.status(200).json(comments);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during comment retrieval" });
  }
});

// POST /reports/:id/messages (citizen - operator communication)
router.post("/reports/:id/messages", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(422).json({ error: "Content is required" });
    }

    const senderType = req.user.role === "user" ? "citizen" : "operator";

    const message = await addMessage(
      reportId,
      senderType,
      req.user.id,
      content.trim()
    );

    // Emit message via WebSocket to report room and user rooms
    const io = getIO();
    if (io) {
      const messagePayload = {
        id: message.message_id,
        report_id: message.report_id,
        sender_type: message.sender_type,
        sender_id: message.sender_id,
        content: message.content,
        sent_at: message.sent_at,
      };

      // Emit to report room (for active chat participants)
      io.to(`report:${reportId}`).emit("new_message", messagePayload);

      // Also emit to user rooms (for header badge updates)
      const participants = await getReportParticipants(reportId);
      if (participants) {
        // Emit to citizen (only if sender is not the citizen)
        if (participants.citizen_id && senderType !== "citizen") {
          io.to(`citizen:${participants.citizen_id}`).emit("new_message", messagePayload);
        }
        // Emit to operator (only if sender is not the operator)
        if (participants.operator_id && (senderType !== "operator" || message.sender_id !== participants.operator_id)) {
          io.to(`operator:${participants.operator_id}`).emit("new_message", messagePayload);
        }
        // Emit to external maintainer (only if sender is not that maintainer)
        if (participants.external_id && (senderType !== "operator" || message.sender_id !== participants.external_id)) {
          io.to(`operator:${participants.external_id}`).emit("new_message", messagePayload);
        }
      }
    }

    return res.status(201).json(message);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during message creation" });
  }
});

// GET /reports/:id/messages (citizen - operator communication)
router.get("/reports/:id/messages", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    const reportId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const messages = await getMessages(reportId);
    return res.status(200).json(messages);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during message retrieval" });
  }
});

export default router;
