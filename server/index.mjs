// import
import express from 'express';
import morgan from 'morgan';
import registration from './router/registration_route.mjs';
import getAll from './router/get-all_route.mjs';
import forms from './router/forms_route.mjs';
import { check, validationResult } from 'express-validator';
import { getUser, getAllReports, updateReportStatus, getAllApprovedReports,setOperatorByReport  } from "./dao.mjs";
import cors from 'cors';

import passport from 'passport';
import LocalStrategy from 'passport-local';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config();

//supabase client
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

/*const { data, error } = await supabase
  .storage
  .createBucket('participium', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
  });*/

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
  if (!user)
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


/* ROUTES OF SECOND SPRINT */

// GET /api/reports -> all reports (requires operator/admin)
app.get('/api/reports', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== 'Admin' && req.user.role !== 'Municipal public relations officer' ) return res.status(403).json({ error: 'Forbidden' });

    const reports = await getAllReports();
    res.status(200).json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(503).json({ error: 'Database error during report retrieval' });
  }
});

// PUT /api/reports/:id/status -> update status of a report (requires operator/admin)
app.put('/api/reports/:id/status', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== 'Admin' && req.user.role !== 'Municipal public relations officer' && req.user.role !== "Technical office staff member"  ) return res.status(403).json({ error: 'Forbidden' });

    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return res.status(423).json({ error: 'Invalid report id' });

    const { status_id, rejection_reason } = req.body;
    if (typeof status_id !== 'number') return res.status(422).json({ error: 'status_id must be a number' });

    const updated = await updateReportStatus(reportId, status_id, rejection_reason || null);
    if (!updated) return res.status(404).json({ error: 'Report not found' });

    res.status(200).json(updated);
  } catch (err) {
    res.status(503).json({ error: 'Database error during status update' });
  }
});

//PUT /api/reports/:id/operator -> set operator for a report (requires operator/admin)
app.put('/api/reports/:id/operator', async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== 'Admin' && req.user.role !== 'Municipal public relations officer' && req.user.role !== "Technical office staff member"  ) return res.status(403).json({ error: 'Forbidden' });  
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) return res.status(423).json({ error: 'Invalid report id' });
    const { operatorId } = req.body;
    if (typeof operatorId !== 'number') return res.status(422).json({ error: 'operatorId must be a number' });
    const updated = await setOperatorByReport(reportId, operatorId);
    if (!updated) return res.status(404).json({ error: 'Report not found' });
    res.sendStatus(200);
  } catch (err) {
    res.status(503).json({ error: 'Database error during operator assignment' });
  }
});

// GET /api/reports/approved -> approved reports for map (public - no auth required)
app.get('/api/reports/approved', async (req, res) => {
  try {
    const reports = await getAllApprovedReports();
    res.status(200).json(reports);
  } catch (err) {
    console.error('Error fetching approved reports:', err);
    res.status(503).json({ error: 'Database error during report retrieval' });
  }
});





/* ROUTES OF THE FIRST SPRINT */

app.use('/api', getAll);
app.use('/api', forms);
app.use('/api', registration);

// POST /api/upload-url -> get signed URL for image upload
app.post('/api/upload-url', async (req, res) => {
  const { filename } = req.body;
  const cleanName = filename.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  const uniqueName = `${Date.now()}-${cleanName}`;

  try {
    const { data, error } = await supabase
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .createSignedUploadUrl(uniqueName);

    if (error) throw error;

    const publicUrl = process.env.SUPABASE_URL + '/storage/v1/object/public/' + process.env.SUPABASE_BUCKET + '/' + uniqueName;

    res.json({
      signedUrl: data.signedUrl,
      path: uniqueName,
      publicUrl: publicUrl
    });
  } catch (err) {
    res.status(500).json({ error: "Could not create signed URL" });
  }
});


/* SESSION ROUTES */

// POST /api/sessions
app.post('/api/sessions', passport.authenticate('local'), function (req, res) {
  return res.status(201).json(req.user);
});

// GET /api/sessions/current
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  }
  else
    res.status(401).json({ error: 'Not authenticated' });
});

// DELETE /api/session/current
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => {
    res.end();
  });
});

// activate server
app.listen(port, () => { console.log(`API server started at http://localhost:${port}`); });