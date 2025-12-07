import { Router } from 'express';
import { check, validationResult } from 'express-validator';
import { insertReport,  createMunicipalityUser } from '../dao.mjs';

const router = Router();

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
router.post('/reports',[
  check('title').exists({ checkFalsy: true }).withMessage('Title is required')
    .isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  check('description').exists({ checkFalsy: true }).withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  check('image_urls').isArray({ min: 1, max: 3 }).withMessage('You must provide between 1 and 3 images'),
  check('latitude').exists().withMessage('Latitude is required')
    .isFloat().withMessage('Latitude must be a number'),
  check('longitude').exists().withMessage('Longitude is required')
    .isFloat().withMessage('Longitude must be a number'),
  check('category_id').exists().withMessage('Category ID is required')
    .isInt().withMessage('Category ID must be an integer'),
  check('anonymous').exists().withMessage('Anonymous is required')
    .isBoolean().withMessage('Anonymous must be boolean'),
], async (req, res) => {

  if (!req.isAuthenticated() || req.user.role !== 'user' ) {
    return res.status(401).json({ error: 'Not authenticated or forbidden' });
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
