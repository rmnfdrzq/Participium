import { Router } from 'express';
import { getAllCompanies } from '../dao.mjs';
const router = Router();


//GET /api/companies -> all companies
router.get('/companies', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const roles = await getAllCompanies();
  return res.status(200).json(roles);
  } catch (err) {
  return res.status(503).json({ error: 'Database error during company retrieval' });
  }
});

export default router;