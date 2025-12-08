import { Router } from 'express';
import { getAllOffices } from '../dao.mjs';

const router = Router();

// GET /api/offices -> all default offices
router.get('/offices', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const offices = await getAllOffices();
  return res.status(200).json(offices);
  } catch (err) {
  return res.status(503).json({ error: 'Database error during office retrieval' });
  }
});

export default router;
