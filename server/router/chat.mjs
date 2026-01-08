import { Router } from "express";
import {
  getChatsByCitizen,
  getChatsByOperator,
  getChatDetails,
  getMessages,
  markChatAsRead,
  getTotalUnreadCount,
} from "../dao.mjs";

const router = Router();

// GET /api/chats - Get all chats for logged user
router.get("/chats", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    let chats;
    if (req.user.role === "user") {
      chats = await getChatsByCitizen(req.user.id);
    } else if (
      req.user.role === "Technical office staff member" ||
      req.user.role === "External maintainer"
    ) {
      chats = await getChatsByOperator(req.user.id, req.user.role);
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json(chats);
  } catch (err) {
    //console.error("Error fetching chats:", err);
    return res.status(503).json({ error: "Database error during chat retrieval" });
  }
});

// GET /api/chats/unread/count - Get total unread messages count (must be before :reportId)
router.get("/chats/unread/count", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userType = req.user.role === "user" ? "citizen" : "operator";
    const count = await getTotalUnreadCount(userType, req.user.id);

    return res.status(200).json({ count });
  } catch (err) {
    //console.error("Error fetching unread count:", err);
    return res.status(503).json({ error: "Database error" });
  }
});

// GET /api/chats/:reportId - Get chat details by report ID
router.get("/chats/:reportId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reportId = parseInt(req.params.reportId, 10);
    if (isNaN(reportId)) {
      return res.status(422).json({ error: "Invalid report id" });
    }

    const chatDetails = await getChatDetails(reportId);
    if (!chatDetails) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Check if user has access to this chat
    if (req.user.role === "user") {
      if (chatDetails.citizen?.id !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else if (
      req.user.role === "Technical office staff member" ||
      req.user.role === "External maintainer"
    ) {
      const isAssigned =
        chatDetails.operator?.id === req.user.id ||
        chatDetails.external?.id === req.user.id;
      if (!isAssigned) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get messages for this chat
    const messages = await getMessages(reportId);

    // Mark chat as read when user opens it
    const userType = req.user.role === "user" ? "citizen" : "operator";
    await markChatAsRead(userType, req.user.id, reportId);

    return res.status(200).json({
      ...chatDetails,
      messages,
    });
  } catch (err) {
    //console.error("Error fetching chat details:", err);
    return res.status(503).json({ error: "Database error during chat retrieval" });
  }
});

// POST /api/chats/:reportId/read - Mark a chat as read
router.post("/chats/:reportId/read", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reportId = parseInt(req.params.reportId, 10);
    if (isNaN(reportId)) {
      return res.status(422).json({ error: "Invalid report id" });
    }

    const userType = req.user.role === "user" ? "citizen" : "operator";
    await markChatAsRead(userType, req.user.id, reportId);

    return res.status(200).json({ success: true });
  } catch (err) {
    //console.error("Error marking chat as read:", err);
    return res.status(503).json({ error: "Database error" });
  }
});

export default router;

