import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { 
  createUser,
  getUserInfoById,
  updateUserById,
  generateEmailVerificationCode,
  verifyEmailCode,
  getActiveVerificationToken
} from '../dao.mjs';

const router = Router();



// POST /registration 
router.post('/registration', [
  check('username')
    .not().isEmail().withMessage('Username cannot be an email')
    .notEmpty().withMessage('Username is required'),
  check('first_name').notEmpty().withMessage('First name is required'),
  check('last_name').notEmpty().withMessage('Last name is required'),
  check('email_notifications').isBoolean().withMessage('Email notification must be true or false'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { username, email, first_name, last_name, email_notifications, password } = req.body;
    const user = await createUser(username, email, first_name, last_name, email_notifications, password);
  return res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
    return res.status(409).json({ error: 'Email or username already exists' });
    } else {
    return res.status(503).json({ error: 'Database error during user creation' });
    }
  }
});

// Get /users/:id -> get user profile of logged-in user (requires authentication)
router.get("/citizens", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    const userId = req.user.id;
    if (isNaN(userId))
      return res.status(423).json({ error: "Invalid user id" });
    const user = await getUserInfoById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
  return res.status(200).json(user);
  } catch (err) {
  return res.status(503).json({ error: "Database error during user retrieval" });
  }
});

// PUT /citizens -> update profile of currently logged-in user (requires authentication)
router.put("/citizens", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    const userId = req.user.id;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No update fields provided" });
    }

    const updatedUser = await updateUserById(userId, updates);

    if (!updatedUser) {
      return res
        .status(404)
        .json({ error: "User not found or no changes applied" });
    }

  return res.json(updatedUser);
  } catch (err) {
  return res.status(500).json({ error: "Internal server error" });
  }
});

/* Verification routes */

// POST /citizens/verification-code
router.post("/citizens/verification-code", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    const userId = req.user.id;
    if (isNaN(userId))
      return res.status(423).json({ error: "Invalid user id" });

    const expires_at = await generateEmailVerificationCode(userId);

    return res.status(200).json({ expires_at });
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during verification code generation" });
  }
});

router.post("/citizens/verify-email", async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    const userId = req.user.id;
    const { code } = req.body;
    if (isNaN(userId))
      return res.status(423).json({ error: "Invalid user id" });
    if (typeof code !== "string")
      return res.status(422).json({ error: "Code must be a string" });
    const isValid = await verifyEmailCode(userId, code);
    if (!isValid)
      return res.status(400).json({ error: "Invalid or expired code" });
  return res.sendStatus(200);
  } catch (err) {
  return res.status(503).json({ error: "Database error during email verification" });
  }
});

// GET /citizens/verification-token
router.get("/citizens/verification-token",  async (req, res) => {
  try {
    if (!req.isAuthenticated())
      return res.status(401).json({ error: "Not authenticated" });
    const userId = req.user.id;
    if (isNaN(userId))
      return res.status(423).json({ error: "Invalid user id" });
    const token = await getActiveVerificationToken(userId);
    if (!token) return res.status(404).json({ error: "No active verification token found" });
    return res.status(200).json(token);
  } catch (err) {
    return res
      .status(503)
      .json({ error: "Database error during verification token retrieval" });
  }
});

export default router;
