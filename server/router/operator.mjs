import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { 
  getAllOperators, 
  getTechnicalOfficersByOffice, 
  getMainteinerByOffice, 
  createMunicipalityUser,
  addOperatorCategory,
  removeOperatorCategory
} from '../dao.mjs';
const router = Router();



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
  return res.json(users);
  } catch (err) {
  return res.status(500).json({ error: 'Failed to fetch users' });
  }
});


//Get /api/operators?operatorId&officeId - Get operators by operatorId and/or officeId
// if I am relation officer (id report office) -> get list operators in that office
// if I am technical officer (id report office) -> get list external maintainer in that office
router.get('/operators', [
  check('category_id').isInt().withMessage('Category ID must be an integer')
  ] , async (req, res) => {

  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { category_id } = req.query;

    if (req.user.role === 'Municipal public relations officer') {
      const operators = await getTechnicalOfficersByOffice( category_id );
      return res.status(200).json(operators);
    }

    if (req.user.role === 'Technical office staff member') {
      // do the same thing for assigning external maintainer
      const maintainers = await getMainteinerByOffice( category_id );
      return res.status(200).json(maintainers);
    }

    if(req.user.role === "External maintainer"){
      return res.status(200).json([]); // to not have an error in get report page
    }
  
    return res.status(422).json({ error: 'Forbidden' }); // if not authorized
  } catch (err) {
      return res.status(503).json(err);
  }
  
});


// POST /api/admin/createuser -> admin creates municipality user
router.post('/admin/createuser', [
  check('username')
    .not().isEmail().withMessage('Username cannot be an email')
    .notEmpty().withMessage('Username is required'),
  check('email')
    .isEmail().withMessage('Invalid email format'),
  check('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('company')
    .notEmpty().withMessage('Company is required')
    .isInt().withMessage('Company ID must be an integer'),
  check('role')
    .notEmpty().withMessage('Role is required')
    .isInt().withMessage('Role ID must be an integer'),
  check('office_id')
    .isArray({ min: 1 }).withMessage('office_id must be a non-empty array'),
  check('office_id.*')
    .notEmpty().withMessage('Each office_id is required')
    .isInt().withMessage('Each office_id must be an integer')
], async (req, res) => {

  if (!req.isAuthenticated() || req.user.role !== 'Admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    let { username, email, password, role, company, office_id } = req.body;

    role = parseInt(role, 10);
    company = parseInt(company, 10); 

    if (company === 1 && role === 5) {
      return res.status(400).json({ error: 'Needs to be different from an External maintainer' });
    }

    if (company !== 1 && role !== 5) {
      return res.status(400).json({ error: 'Needs to be an External maintainer' });
    }
    const user = await createMunicipalityUser(
      email,
      username,
      password,
      role,
      company
    );

    const operator_id = user.id;

    if (role !== 3 && role !== 5) {
      return res.status(201).json(user);
    }

    for (const office of office_id) {
      console.log('Attempting to add category:', office, 'to operator:', operator_id);
      try {
        await addOperatorCategory(operator_id, office);
        console.log('Successfully added category:', office);
      } catch (err) {
        console.error('Failed to add category:', office, 'Error:', err);
        // Non fare throw qui, per vedere tutti gli errori
      }
    }

    return res.status(201).json(user);

  } catch (err) {
    
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    } else {
      return res.status(503).json({ 
        error: 'Database error during user creation',
        details: err.message // Mostra il messaggio di errore
      });
    }
  }
});


// POST /api/admin/addcategory -> Admin adds a category to an operator
router.post('/admin/addcategory', [
  check('operator_id').isInt().withMessage('Operator ID must be an integer'),
  check('category_id').isInt().withMessage('Category ID must be an integer')
], async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== 'Admin') return res.status(401).json({ error: 'Not authorized' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { operator_id, category_id } = req.body;
    const result = await addOperatorCategory(operator_id, category_id);
    return res.status(201).json(result);
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to add operator category' });
  }
});

// DELETE /api/admin/removecategory -> Admin removes a category from an operator
router.delete('/admin/removecategory', [
  check('operator_id').isInt().withMessage('Operator ID must be an integer'),
  check('category_id').isInt().withMessage('Category ID must be an integer')
], async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== 'Admin') return res.status(401).json({ error: 'Not authorized' });

  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const { operator_id, category_id } = req.body;
    const result = await removeOperatorCategory(operator_id, category_id);
    return res.status(200).json(result);
  } catch (err) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to remove operator category' });
  }
});


export default router;