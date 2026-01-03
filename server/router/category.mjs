import { Router } from 'express';
import { getAllCategories, getCompanyCategories } from '../dao.mjs';

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

// GET /api/admin/companies/:companyId/categories
router.get('/admin/companies/:companyId/categories', async (req, res) => {

  if (!req.isAuthenticated() || req.user.role !== 'Admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }

  try {
    const { companyId } = req.params;
    
    const result = await getCompanyCategories(companyId); 
    
    return res.status(200).json(result);
  } catch (err) {
    console.error(err); 
    res.status(503).json({ error: 'Database error' });
  }
});

export default router;
