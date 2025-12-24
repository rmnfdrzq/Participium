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
      return res.status(200).json(maintainers);
    }

    if(req.user.role === "External maintainer"){
      return res.status(200).json([]); // to not have errrore in get report page
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
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('office_id').isInt().withMessage('Office ID must be an integer'),
  check('company').isInt().withMessage('Company ID must be an integer'),
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
    let { username, email, password, office_id, role, company } = req.body;

    if ((role !== 3 && role !== 5) && office_id !== 1){
      // 3 = Technical office staff member
      // 5 = External maintainer
      // 1 = Organization office
      office_id = 1; // corrects the input without giving an error
    }

    if((company!==1 && role===5) || (company===1 && role!==5)){
      // 1 = Participium
      return res.status(400).json({ error: 'Needs to be External mainteiner' });
    }


    const user = await createMunicipalityUser(email, username, password, office_id, role, company);
    return res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    } else {
      return res.status(503).json({ error: 'Database error during user creation' });
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