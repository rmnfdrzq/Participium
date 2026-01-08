import { Router } from 'express';
import { getAllCategories, getCompanyCategories, getCategoriesByOperator } from '../dao.mjs';

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
    //console.error(err); 
    res.status(503).json({ error: 'Database error' });
  }
});

// GET /api/operators/my-categories -> Get categories for authenticated operator
router.get('/operators/my-categories', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const operator_id = req.user.id;
    const categories = await getCategoriesByOperator(operator_id);
    
    return res.status(200).json({ categories });
    
  } catch (err) {
    //console.error('Error fetching operator categories:', err);
    return res.status(503).json({ error: 'Database error during category fetch' });
  }
});

export default router;
