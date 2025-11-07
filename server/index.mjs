// import
import express from 'express';
import morgan from 'morgan';
import {check, validationResult} from 'express-validator';
import {getUser, createUser, getAllOffices, createOperator, getOperator} from './dao.mjs';
import cors from 'cors';

import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';

// init
const app = express();
const port = 3001;

// middleware
app.use(express.json());
app.use(morgan('dev'));

const corsOptions = {
  origin: 'http://localhost:5173',
  optionsSuccessState: 200,
  credentials: true
};

app.use(cors(corsOptions));

passport.use(new LocalStrategy(async function verify(username, password, cb) {
  const user = await getUser(username, password);
  if(!user)
    return cb(null, false, 'Incorrect username or password.');
    
  return cb(null, user);
}));

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  return cb(null, user);
});

app.use(session({
  secret: "shhhhh... it's a secret!",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

/* ROUTES */

// can use let id= req.user? req.user.id:0; in the APIs

// POST /api/registration
app.post('/api/registration', [
  check('username').notEmpty().withMessage('Username is required'),
  check('first_name').notEmpty().withMessage('First name is required'),
  check('last_name').notEmpty().withMessage('Last name is required'),
  check('email_notifications').isBoolean().withMessage('Email notification must be true or false'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { username, email, first_name, last_name, email_notifications, password } = req.body;
    const user = await createUser(username, email, first_name, last_name, email_notifications, password);
    res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(503).json({ error: 'Database error during user creation' });
    }
  }
});


// GET /api/offices
app.get('/api/offices', async (req, res) => {
  try {
    const offices = await getAllOffices();
    res.status(200).json(offices);
  } catch (err) {
    res.status(503).json({ error: 'Database error during office retrieval' });
  }
});


// POST /api/operators
app.post('/api/operators', [
  check('username').notEmpty().withMessage('Username is required'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  check('office_id').isInt().withMessage('Office ID must be an integer')
], async (req, res) => {

  if (!req.isAuthenticated() || req.user.username!=='admin' || req.user.type!=='operator') return res.status(401).json({error: 'Not authorized'});

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  try {
    const { username, email, password, office_id } = req.body;
    const operator = await createOperator(email, username, password, office_id);
    res.status(201).json(operator);
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(503).json({ error: 'Database error during operator creation' });
    }
  }
});



// POST /api/sessions
app.post('/api/sessions', passport.authenticate('local'), function(req, res) {
  return res.status(201).json(req.user);
});

// GET /api/sessions/current
app.get('/api/sessions/current', (req, res) => {
  if(req.isAuthenticated()) {
    res.json(req.user);}
  else
    res.status(401).json({error: 'Not authenticated'});
});

// DELETE /api/session/current
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.end();
  });
});

// activate server
app.listen(port, () => { console.log(`API server started at http://localhost:${port}`); });