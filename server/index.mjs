// import
import express from 'express';
import morgan from 'morgan';
import {check, validationResult} from 'express-validator';
import {getUser, createUser, getAllOffices, createMunicipalityUser, getAllOperators, getAllCategories, insertReport} from './dao.mjs';
import cors from 'cors';

import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config();

//supabase client
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const {data, error} = await supabase
.storage
.createBucket('participium', { 
  public: true,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
});

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

// can use req.user ={ id, username,type}

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

// GET /api/offices -> all default offices
app.get('/api/offices', async (req, res) => {
  try {
    const offices = await getAllOffices();
    res.status(200).json(offices);
  } catch (err) {
    res.status(503).json({ error: 'Database error during office retrieval' });
  }
});

// GET /api/categories -> all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await getAllCategories(); 
    res.status(200).json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(503).json({ error: 'Database error during category retrieval' });
  }
});


// GET /api/admin - Get all (and only) operators
app.get('/api/admin', async (req, res) => {
  try {

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.username !== 'admin' && req.user.type!== 'operator') {
     return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await getAllOperators(); 
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/createuser -> admin creates municipality user
app.post('/api/admin/createuser', [
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
    const operator = await createMunicipalityUser(email, username, password, office_id);
    res.status(201).json(operator);
  } catch (err) {
    if (err.code === '23505') { // PostgreSQL unique violation
      res.status(409).json({ error: 'Email or username already exists' });
    } else {
      res.status(503).json({ error: 'Database error during operator creation' });
    }
  }
});

//POST /api/reports
app.post('/api/reports', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const { description, image_name, image_bytes, latitude, longitude } = req.body;
    const report = await insertReport({ citizen_id: req.user.id, description, image_name, image_bytes, latitude, longitude }, supabase);
    res.status(201).json(report);
  } catch (err) {
    console.error('Error inserting report:', err);
    res.status(503).json({ error: 'Database error during report insertion' });
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