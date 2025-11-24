import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// console.log("Loaded dao.mjs and changed insertReport");

//get all technical officers by relation officer's office_id
export const getTechnicalOfficersByOffice = async (officerId, officeId) => {
  let resultOfficers;
  try {
    if (officerId && !officeId) {
      const sqlGetOfficer = 'SELECT * FROM operators WHERE operator_id = $1';
      const result = await pool.query(sqlGetOfficer, [officerId]);
      if(result.rows.length === 0) {
        throw new Error('Either valid officer_id or office_id must be provided');
      }
      console.log(result.rows[0]);
      const operatorRoleSql = 'SELECT role_id FROM roles WHERE name = \'Municipal public relations officer\'  AND role_id = $1';
      const operatorRoleResult = await pool.query(operatorRoleSql, [result.rows[0].role_id]);
      if(operatorRoleResult.rows.length === 0) {
        throw new Error('Operatot not allowed, he is not a Municipal public relations officer');
      }
      const sqlGetTechnicalOfficers = 'SELECT * FROM operators WHERE office_id = $1 AND role_id = (SELECT role_id FROM roles WHERE name = \'Technical office staff member\')';
      resultOfficers = await pool.query(sqlGetTechnicalOfficers, [result.rows[0].office_id]);
    } else if ((!officerId && officeId) || (officerId && officeId)) {
      const sqlGetTechnicalOfficers = 'SELECT * FROM operators WHERE office_id = $1 AND role_id = (SELECT role_id FROM roles WHERE name = \'Technical office staff member\')';
      resultOfficers = await pool.query(sqlGetTechnicalOfficers, [officeId]);
    } else {
      throw new Error('officer_id or office_id must be provided');
    }
  } catch (err) {
    console.error('Error fetching technical officers:', err);
    throw err;
  }
  return resultOfficers.rows
    .map((e) => ({
      id: e.operator_id,
      email: e.email,
      username: e.username,
      office_id: e.office_id
      }));
}


//given username (email) and password does the login -> searches in citizen and then operators tables
export const getUser = async (username, password) => {
  try {
    // First try to find in operators table
    const operatorSql = 'SELECT o.*, r.name as role_name FROM operators o JOIN roles r ON o.role_id = r.role_id WHERE o.email = $1';
    const operatorResult = await pool.query(operatorSql, [username]);

    if (operatorResult.rows.length > 0) {
      const row = operatorResult.rows[0];
      const user = {
        id: row.operator_id,
        username: row.username,
        role: row.role_name
      };

      return new Promise((resolve, reject) => {
        crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
          if (err) return reject(err);

          const match = crypto.timingSafeEqual(
            Buffer.from(row.password_hash, 'hex'),
            hashedPassword
          );

          resolve(match ? user : false);
        });
      });
    }

    // If not found in operators, try citizens
    const citizenSql = 'SELECT * FROM citizens WHERE email = $1';
    const citizenResult = await pool.query(citizenSql, [username]);

    const row = citizenResult.rows[0];
    if (!row) return false;

    const user = { id: row.citizen_id, username: row.username, role: "user" };

    return new Promise((resolve, reject) => {
      crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
        if (err) return reject(err);

        const match = crypto.timingSafeEqual(
          Buffer.from(row.password_hash, 'hex'),
          hashedPassword
        );

        resolve(match ? user : false);
      });
    });
  } catch (err) {
    throw err;
  }
};

//given username (email) and password does the login -> searches only in the onperators tables
export const getOperators = async (username, password) => {
  try {
    const sql = 'SELECT * FROM operators JOIN roles ON operators.role_id = roles.role_id WHERE email = $1';
    const result = await pool.query(sql, [username]);

    const row = result.rows[0];
    if (!row) return false;

    const user = { id: row.operator_id, username: row.username, role: row.role_name };

    return new Promise((resolve, reject) => {
      crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
        if (err) return reject(err);

        const match = crypto.timingSafeEqual(
          Buffer.from(row.password_hash, 'hex'),
          hashedPassword
        );

        resolve(match ? user : false);
      });
    });
  } catch (err) {
    throw err;
  }
};

//ginen user data creates a citizen
export const createUser = async (username, email, first_name, last_name, email_notifications, password) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = 'INSERT INTO citizens (username, email,first_name,last_name, password_hash,email_notifications, salt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING citizen_id';
      const values = [username, email, first_name, last_name, hashedPassword.toString('hex'), email_notifications, salt];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].citizen_id, username: username, first_name: first_name });
      } catch (err) {
        reject(err);
      }
    });
  });
};

//returns all default offices 
export const getAllOffices = async () => {
  try {
    const sql = 'SELECT * FROM offices';
    const result = await pool.query(sql);
    return result.rows.map((e) => { return { id: e.office_id, name: e.name }; });
  } catch (err) {
    throw err;
  }
};

//returns all roles
export const getAllRoles = async () => {
  try {
    const sql = ' SELECT * FROM roles';
    const result = await pool.query(sql);
    return result.rows.map((e) => { return { id: e.role_id, name: e.name }; });
  } catch (err) {
    throw err;
  }
};

//returns all operators with its data 
export const getAllOperators = async () => {
  try {
    const sql = `
      SELECT o.operator_id, o.email, o.username, o.office_id, off.name as office_name, r.name as role_name
      FROM operators o
      LEFT JOIN offices off ON o.office_id = off.office_id
      LEFT JOIN roles r ON o.role_id = r.role_id
      ORDER BY o.operator_id DESC
    `;
    const result = await pool.query(sql);
    return result.rows.map((row) => ({
      id: row.operator_id,
      email: row.email,
      username: row.username,
      office_id: row.office_id,
      office_name: row.office_name,
      role: row.role_name
    }));
  } catch (err) {
    throw err;
  }
};

export const insertReport = async ({ title, citizen_id, description, image_urls, latitude, longitude, category_id, anonymous }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get office_id from category
    const categorySql = 'SELECT office_id FROM categories WHERE category_id = $1';
    const categoryResult = await client.query(categorySql, [category_id]);

    if (categoryResult.rows.length === 0) {
      throw new Error('Invalid category_id');
    }

    const office_id = categoryResult.rows[0].office_id;

    // Get "Pending Approval" status_id
    const statusSql = 'SELECT status_id FROM statuses WHERE name = $1';
    const statusResult = await client.query(statusSql, ['Pending Approval']);
    const status_id = statusResult.rows[0].status_id;

    const reportSql = `
      INSERT INTO reports (citizen_id, category_id, office_id, status_id, title, description, latitude, longitude, anonymous, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING report_id, citizen_id, category_id, office_id, status_id, title, description, latitude, longitude, anonymous, created_at
    `;
    const reportValues = [citizen_id, category_id, office_id, status_id, title, description, latitude, longitude, anonymous || false];
    const reportResult = await client.query(reportSql, reportValues);
    const report = reportResult.rows[0];

    const imagesSql = `
      INSERT INTO photos (report_id, image_url, uploaded_at)
      VALUES ($1, $2, NOW())
      RETURNING photo_id, report_id, image_url, uploaded_at
    `;
    const images = [];
    for (const url of image_urls) {
      const imageResult = await client.query(imagesSql, [report.report_id, url]);
      images.push(imageResult.rows[0]);
    }

    await client.query('COMMIT');

    return { ...report, images };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

//given operator data creates an operator
export const createMunicipalityUser = async (email, username, password, office_id, role_id) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = `
        INSERT INTO operators (email, username, password_hash, salt, office_id, role_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING operator_id
      `;
      const values = [email, username, hashedPassword.toString('hex'), salt, office_id, role_id];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].operator_id, username });
      } catch (err) {
        reject(err);
      }
    });
  });
};


// returns all categories
export const getAllCategories = async () => {
  try {
    const sql = 'SELECT * FROM categories';
    const result = await pool.query(sql);

    return result.rows.map((e) => ({
      id: e.category_id,
      name: e.name,
      office_id: e.office_id
    }));
  } catch (err) {
    throw err;
  }
};

// returns all reports with related info and photos
export const getAllReports = async () => {
  try {
    const sql = `
      SELECT
        r.report_id,
        r.title,
        r.description,
        r.latitude,
        r.longitude,
        r.anonymous,
        r.rejection_reason,
        r.created_at,
        r.updated_at,
        r.citizen_id,
        c.username as citizen_username,
        c.first_name as citizen_first_name,
        c.last_name as citizen_last_name,
        r.category_id,
        cat.name as category_name,
        r.office_id,
        off.name as office_name,
        r.status_id,
        s.name as status_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object('photo_id', p.photo_id, 'image_url', p.image_url)) FILTER (WHERE p.photo_id IS NOT NULL), '[]') AS photos
      FROM reports r
      LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
      LEFT JOIN categories cat ON r.category_id = cat.category_id
      LEFT JOIN offices off ON r.office_id = off.office_id
      LEFT JOIN statuses s ON r.status_id = s.status_id
      LEFT JOIN photos p ON r.report_id = p.report_id
      GROUP BY r.report_id, c.citizen_id, c.username, c.first_name, c.last_name, cat.name, off.name, s.name
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(sql);
    return result.rows.map((row) => ({
      id: row.report_id,
      title: row.title,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      anonymous: row.anonymous,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      citizen: row.citizen_id ? {
        id: row.citizen_id,
        username: row.citizen_username,
        first_name: row.citizen_first_name,
        last_name: row.citizen_last_name
      } : null,
      category: { id: row.category_id, name: row.category_name },
      office: { id: row.office_id, name: row.office_name },
      status: { id: row.status_id, name: row.status_name },
      photos: row.photos || []
    }));
  } catch (err) {
    throw err;
  }
};

// update the status of a report (optionally include rejection_reason)
export const updateReportStatus = async (report_id, status_id, rejection_reason = null) => {
  const client = await pool.connect();
  try {
    //await client.query('BEGIN');

    let rejection = null;
    if (status_id === 5) {  // solo se lo status è "Rejected"
      rejection = rejection_reason || null; // prendi il valore passato o null
    }

    const updateSql = `
      UPDATE reports
      SET status_id = $2,
          rejection_reason = $3,
          updated_at = NOW()
      WHERE report_id = $1
      RETURNING *
    `;
    const updateResult = await client.query(updateSql, [report_id, status_id, rejection_reason]);

    if (updateResult.rows.length === 0) {
      //await client.query('ROLLBACK');
      return null;
    }

    // return the updated report with related info and photos
    const selectSql = `
      SELECT
        r.report_id,
        r.title,
        r.description,
        r.latitude,
        r.longitude,
        r.anonymous,
        r.rejection_reason,
        r.created_at,
        r.updated_at,
        r.citizen_id,
        c.username as citizen_username,
        c.first_name as citizen_first_name,
        c.last_name as citizen_last_name,
        r.category_id,
        cat.name as category_name,
        r.office_id,
        off.name as office_name,
        r.status_id,
        s.name as status_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object('photo_id', p.photo_id, 'image_url', p.image_url)) FILTER (WHERE p.photo_id IS NOT NULL), '[]') AS photos
      FROM reports r
      LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
      LEFT JOIN categories cat ON r.category_id = cat.category_id
      LEFT JOIN offices off ON r.office_id = off.office_id
      LEFT JOIN statuses s ON r.status_id = s.status_id
      LEFT JOIN photos p ON r.report_id = p.report_id
      WHERE r.report_id = $1
      GROUP BY r.report_id, c.citizen_id, c.username, c.first_name, c.last_name, cat.name, off.name, s.name
    `;

    const selectResult = await client.query(selectSql, [report_id]);
    //await client.query('COMMIT');

    const row = selectResult.rows[0];
    if (!row) return null;

    return {
      id: row.report_id,
      title: row.title,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      anonymous: row.anonymous,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      updated_at: row.updated_at,
      citizen: row.citizen_id ? {
        id: row.citizen_id,
        username: row.citizen_username,
        first_name: row.citizen_first_name,
        last_name: row.citizen_last_name
      } : null,
      category: { id: row.category_id, name: row.category_name },
      office: { id: row.office_id, name: row.office_name },
      status: { id: row.status_id, name: row.status_name },
      photos: row.photos || []
    };
  } catch (err) {
    //await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getAllApprovedReports = async () => {
  try {
    const sql = `
      SELECT
        r.report_id,
        r.title,
        r.description,
        r.latitude,
        r.longitude,
        r.anonymous,
        r.created_at,
        r.updated_at,
        r.citizen_id,
        c.username as citizen_username,
        c.first_name as citizen_first_name,
        c.last_name as citizen_last_name,
        r.category_id,
        cat.name as category_name,
        r.office_id,
        off.name as office_name,
        r.status_id,
        s.name as status_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object('photo_id', p.photo_id, 'image_url', p.image_url)) FILTER (WHERE p.photo_id IS NOT NULL), '[]') AS photos
      FROM reports r
      LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
      LEFT JOIN categories cat ON r.category_id = cat.category_id
      LEFT JOIN offices off ON r.office_id = off.office_id
      LEFT JOIN statuses s ON r.status_id = s.status_id
      LEFT JOIN photos p ON r.report_id = p.report_id
      WHERE r.status_id IN (2, 3, 4)
      GROUP BY r.report_id, c.citizen_id, c.username, c.first_name, c.last_name, cat.name, off.name, s.name
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(sql);
    return result.rows.map((row) => ({
      id: row.report_id,
      title: row.title,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      anonymous: row.anonymous,
      created_at: row.created_at,
      updated_at: row.updated_at,
      citizen: row.anonymous ? null : (row.citizen_id ? {
        username: row.citizen_username,
        first_name: row.citizen_first_name,
        last_name: row.citizen_last_name
      } : null),
      category: { id: row.category_id, name: row.category_name },
      office: { id: row.office_id, name: row.office_name },
      status: { id: row.status_id, name: row.status_name },
      photos: row.photos || []
    }));
  } catch (err) {
    throw err;
  }
};

export const setOperatorByReport = async (report_id, operator_id) => {

  

  try {
    const sql = `UPDATE reports
      SET assigned_to_operator_id = $2,
          updated_at = NOW()
      WHERE report_id = $1
      RETURNING 
        report_id,
        assigned_to_operator_id,
        title,
        status_id,
        updated_at
    `;
    const result = await pool.query(sql, [report_id, operator_id]); 
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};  