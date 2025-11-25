import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { insertReport,  createMunicipalityUser } from '../dao.mjs';

const router = Router();

// POST /api/admin/createuser -> admin creates municipality user
router.post('/admin/createuser', [
  check('username').notEmpty().withMessage('Username is required'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('office_id').isInt().withMessage('Office ID must be an integer'),
  check('role').isInt().withMessage('Role ID must be an integer')
], async (req, res) => {

  if (!req.isAuthenticated() || req.user.role !== 'Admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { username, email, password, office_id, role } = req.body;
    const user = await createMunicipalityUser(email, username, password, office_id, role);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(503).json({ error: 'Database error during user creation' });
    }
  }
});

//POST /api/reports
router.post('/reports', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
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
    res.status(201).json(report);
  } catch (err) {
    res.status(503).json({ error: err.message});
  }
});

export default router;
