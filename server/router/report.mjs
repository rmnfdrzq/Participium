import { Router } from 'express';
import { check } from 'express-validator';
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
  getMessages
 } from '../dao.mjs';

const router = Router();

//POST /reports
router.post('/reports',[
  check('title').exists({ checkFalsy: true }).withMessage('Title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  check('description').exists({ checkFalsy: true }).withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  check('image_urls').isArray({ min: 1, max: 3 }).withMessage('You must provide between 1 and 3 images'),
  check('latitude').exists().withMessage('Latitude is required')
    .isFloat().withMessage('Latitude must be a number'),
  check('longitude').exists().withMessage('Longitude is required')
    .isFloat().withMessage('Longitude must be a number'),
  check('category_id').exists().withMessage('Category ID is required')
    .isInt().withMessage('Category ID must be an integer'),
  check('anonymous').exists().withMessage('Anonymous is required')
    .isBoolean().withMessage('Anonymous must be boolean'),
], async (req, res) => {

  if (!req.isAuthenticated() || req.user.role !== 'user' ) {
    return res.status(401).json({ error: 'Not authenticated or forbidden' });
  }


  try {
    const { title, description, image_urls, latitude, longitude, category_id, anonymous } = req.body;
    const report = await insertReport({ 
      title, 
      citizen_id: req.user.id, 
      description, 
      image_urls, 
      latitude, 
      longitude,
      category_id,
      anonymous 
    });
  return res.status(201).json(report);
  } catch (err) {
  return res.status(503).json({ error: err.message});
  }
});

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
  return res.status(503).json({ error: "Database error during report retrieval" });
  }
});


// PUT /reports/:id/status -> update status of a report without assigning (requires rel.officer/admin/technical staff/external maintainer)
router.put("/reports/:id/status", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (req.user.role === "user" || req.user.role === "Municipal administrator")
      return res.status(403).json({ error: "Forbidden" });

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
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

  return res.status(200).json(updated);
  } catch (err) {
  return res.status(503).json({ error: "Database error during status update" });
  }
});

//PUT /reports/:id/operator -> set operator for a report (requires rel.officer/admin)
router.put("/reports/:id/operator", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (
      req.user.role !== "Municipal public relations officer" &&
      req.user.role !== "Admin"
    )
      return res.status(403).json({ error: "Forbidden" });
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
      return res.status(423).json({ error: "Invalid report id" });
    const { operatorId } = req.body;
    if (typeof operatorId !== "number")
      return res.status(422).json({ error: "operatorId must be a number" });
    const updated = await setOperatorByReport(reportId, operatorId);
    if (!updated) return res.status(404).json({ error: "Report not found" });
  return res.sendStatus(200);
  } catch (err) {
    res
      .status(503)
      .json({ error: "Database error during operator assignment" });
  }
});

//PUT /reports/:id/mainteiner -> set mainteiner for a report (requires tec.officer/admin)
router.put("/reports/:id/mainteiner", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    if (
      req.user.role !== "Technical office staff member" &&
      req.user.role !== "Admin"
    )
      return res.status(403).json({ error: "Forbidden" });
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
      return res.status(423).json({ error: "Invalid report id" });

    const { operatorId } = req.body;
    if (typeof operatorId !== "number")
      return res.status(422).json({ error: "operatorId must be a number" });
    const updated = await setMainteinerByReport(reportId, operatorId);
    if (!updated) return res.status(404).json({ error: "Report not found" });
  return res.sendStatus(200);
  } catch (err) {
    res
      .status(503)
      .json({ error: "Database error during operator assignment" });
  }
});

// GET /reports/approved -> approved reports for map (public only to registered user)
router.get("/reports/approved", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    const reports = await getAllApprovedReports();
  return res.status(200).json(reports);
  } catch (err) {
  return res.status(503).json({ error: "Database error during report retrieval" });
  }
});

// GET /reports/assigned -> reports assigned to the logged-in technical staff (requires Technical office staff member/External maintainer)
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

    if (req.user.type !== "operator") {
      return res.status(403).json({ error: "Forbidden - operators only" });
    }

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
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
    console.error(err);
  return res.status(503).json({ error: "Database error during comment creation" });
  }
});

// GET /reports/:id/internal-comments (operators only)
router.get("/reports/:id/internal-comments", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    if (req.user.type !== "operator") {
      return res.status(403).json({ error: "Forbidden - operators only" });
    }

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const comments = await getInternalComments(reportId);
  return res.status(200).json(comments);
  } catch (err) {
    console.error(err);
  return res.status(503).json({ error: "Database error during comment retrieval" });
  }
});

// POST /reports/:id/messages (citizen - operator communication)
router.post("/reports/:id/messages", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const { content } = req.body;
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(422).json({ error: "Content is required" });
    }

    const senderType = req.user.type === "operator" ? "operator" : "citizen";

    const message = await addMessage(
      reportId,
      senderType,
      req.user.id,
      content.trim()
    );
  return res.status(201).json(message);
  } catch (err) {
    console.error(err);
  return res.status(503).json({ error: "Database error during message creation" });
  }
});

// GET /reports/:id/messages (citizen - operator communication)
router.get("/reports/:id/messages", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId))
      return res.status(422).json({ error: "Invalid report id" });

    const messages = await getMessages(reportId);
  return res.status(200).json(messages);
  } catch (err) {
  return res.status(503).json({ error: "Database error during message retrieval" });
  }
});


export default router;
