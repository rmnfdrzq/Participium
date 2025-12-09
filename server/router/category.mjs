import { Router } from 'express';
import { getAllCategories } from '../dao.mjs';

const router = Router();


// GET /api/categories -> all categories
router.get('/categories', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const categories = await getAllCategories();
  return res.status(200).json(categories);
  } catch (err) {
    return res.status(503).json({ error: 'Database error during category retrieval' });
  }
});


export default router;
