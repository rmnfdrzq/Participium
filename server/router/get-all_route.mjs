import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { getAllOffices, getAllRoles, getAllCategories, getAllOperators, getTechnicalOfficersByOffice, getMainteinerByOffice, getAllCompanies } from '../dao.mjs';

const router = Router();

// GET /api/offices -> all default offices
router.get('/offices', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const offices = await getAllOffices();
    res.status(200).json(offices);
  } catch (err) {
    res.status(503).json({ error: 'Database error during office retrieval' });
  }
});

//GET /api/roles -> all roles
router.get('/roles', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const roles = await getAllRoles();
    res.status(200).json(roles);
  } catch (err) {
    res.status(503).json({ error: 'Database error during role retrieval' });
  }
});

//GET /api/companies -> all companies
router.get('/companies', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const roles = await getAllCompanies();
    res.status(200).json(roles);
  } catch (err) {
    res.status(503).json({ error: 'Database error during company retrieval' });
  }
});

// GET /api/categories -> all categories
router.get('/categories', async (req, res) => {
  try {
    if (!req.isAuthenticated() ) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const categories = await getAllCategories();
    res.status(200).json(categories);
  } catch (err) {
    res.status(503).json({ error: 'Database error during category retrieval' });
  }
});

// GET /api/admin - Get all (and only) operators
router.get('/admin', async (req, res) => {
  try {

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await getAllOperators();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

//Get /api/operators?operatorId&officeId - Get operators by operatorId and/or officeId
// if I am relation officer (id report office) -> get list operators in that office
// if I am technical officer (id report office) -> get list external maintainer in that office
router.get('/operators', [
  check('office_id').isInt().withMessage('Office ID must be an integer')
  ] , async (req, res) => {

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { office_id } = req.query;

    if (req.user.role === 'Municipal public relations officer') {
      const operators = await getTechnicalOfficersByOffice( office_id );
      return res.status(200).json(operators);
    }

    if (req.user.role === 'Technical office staff member') {
      // do the same thing for assigning external maintainer
      const maintainers = await getMainteinerByOffice( office_id );
      res.status(200).json(maintainers);
    }
  
    return res.status(422).json({ error: 'Forbidden' }); // if not authorized
  } catch (err) {
      return res.status(503).json(err);
  }
  
});

export default router;
