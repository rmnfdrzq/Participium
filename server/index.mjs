// import
import express from "express";
import morgan from "morgan";
import category from "./router/category.mjs";
import role from "./router/role.mjs";
import office from "./router/office.mjs";
import operator from "./router/operator.mjs";
import citizen from "./router/citizen.mjs";
import report from "./router/report.mjs";
import company from "./router/company.mjs";
import { getUser } from "./dao.mjs";
import cors from "cors";

import passport from "passport";
import LocalStrategy from "passport-local";
import session from "express-session";
import dotenv from "dotenv";
dotenv.config();

//supabase client
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// init
const app = express();
const port = 3001;

// middleware
app.use(express.json());
app.use(morgan("dev"));

const corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessState: 200,
  credentials: true,
};

app.use(cors(corsOptions));

passport.use(
  new LocalStrategy(async function verify(username, password, cb) {
    const user = await getUser(username, password);
    if (!user) return cb(null, false, "Incorrect username or password.");

    return cb(null, user);
  })
);

passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (user, cb) {
  return cb(null, user);
});

app.use(
  session({
    secret: "shhhhh... it's a secret!",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.authenticate("session"));

/* ROUTES */
app.use("/api", category);
app.use("/api", citizen);
app.use("/api", company);
app.use("/api", office);
app.use("/api", operator);
app.use("/api", report);
app.use("/api", role);

// POST /api/upload-url -> get signed URL for image upload
app.post("/api/upload-url", async (req, res) => {
  const { filename } = req.body;
  const cleanName = filename.replace(/\s+/g, "_").replace(/[^\w.-]/g, "");
  const uniqueName = `${Date.now()}-${cleanName}`;

  try {
    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .createSignedUploadUrl(uniqueName);

    if (error) throw error;

    const publicUrl =
      process.env.SUPABASE_URL +
      "/storage/v1/object/public/" +
      process.env.SUPABASE_BUCKET +
      "/" +
      uniqueName;

    return res.json({
      signedUrl: data.signedUrl,
      path: uniqueName,
      publicUrl: publicUrl,
    });
  } catch (err) {
    return res.status(500).json({ error: "Could not create signed URL" });
  }
});

/* SESSION ROUTES */
// POST /api/sessions
app.post("/api/sessions", passport.authenticate("local"), function (req, res) {
  return res.status(201).json(req.user);
});
// GET /api/sessions/current
app.get("/api/sessions/current", (req, res) => {
  if (req.isAuthenticated()) {
  return res.json(req.user);
  } else res.status(401).json({ error: "Not authenticated" });
});
// DELETE /api/session/current
app.delete("/api/sessions/current", (req, res) => {
  req.logout(() => {
  return res.end();
  });
});
// activate server
app.listen(port, () => {
  console.log(`API server started at http://localhost:${port}`);
});
