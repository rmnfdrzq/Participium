import { Router } from 'express';
import { getAllRoles } from '../dao.mjs';

const router = Router();


//GET /api/roles -> all roles
router.get('/roles', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const roles = await getAllRoles();
  return res.status(200).json(roles);
  } catch (err) {
  return res.status(503).json({ error: 'Database error during role retrieval' });
  }
});

export default router;