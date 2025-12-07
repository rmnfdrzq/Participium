import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { createUser } from '../dao.mjs';

const router = Router();

// POST /api/registration 
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
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(503).json({ error: 'Database error during user creation' });
    }
  }
});


export default router;
