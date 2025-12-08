import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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

// returns all reports assigned to a specific operator (internal technical staff or external maintainer)
export const getReportsAssigned = async (operator_id) => {
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
            r.assigned_to_operator_id,
            r.assigned_to_external_id,
            op.username as operator_username,
            op.email as operator_email,
            op.company_id,
            comp.name as company_name,
            COALESCE(json_agg(DISTINCT jsonb_build_object('photo_id', p.photo_id, 'image_url', p.image_url)) FILTER (WHERE p.photo_id IS NOT NULL), '[]') AS photos
          FROM reports r
          LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
          LEFT JOIN categories cat ON r.category_id = cat.category_id
          LEFT JOIN offices off ON r.office_id = off.office_id
          LEFT JOIN statuses s ON r.status_id = s.status_id
          LEFT JOIN operators op ON r.assigned_to_operator_id = op.operator_id
          LEFT JOIN companies comp ON op.company_id = comp.company_id
          LEFT JOIN photos p ON r.report_id = p.report_id
          WHERE r.assigned_to_operator_id = $1 OR r.assigned_to_external_id = $1
          GROUP BY r.report_id, c.citizen_id, c.username, c.first_name, c.last_name, cat.name, off.name, s.name, op.operator_id, op.username, op.email, op.company_id, comp.company_id, comp.name
          ORDER BY r.updated_at DESC
        `;

    const result = await pool.query(sql, [operator_id]);
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
      assigned_to_operator: row.assigned_to_operator_id ? {
        id: row.assigned_to_operator_id,
        username: row.operator_username,
        email: row.operator_email,
        company: row.company_name
      } : null,
      assigned_to_external: row.assigned_to_external_id ? row.assigned_to_external_id : null,
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
    if (status_id === 5) {  // only if status is "Rejected"
      rejection = rejection_reason || null;
    }

    const updateSql = `
          UPDATE reports
          SET status_id = $2,
              rejection_reason = $3,
              updated_at = NOW()
          WHERE report_id = $1
          RETURNING *
        `;

        const updateResult = await client.query(updateSql, [report_id, status_id, rejection]);
    
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
            r.assigned_to_operator_id,
            op.username as operator_username,
            op.email as operator_email,
            r.assigned_to_external_id,
            ext_op.username as external_operator_username,
            ext_op.email as external_operator_email,
            comp.name as external_company_name,
            COALESCE(json_agg(DISTINCT jsonb_build_object('photo_id', p.photo_id, 'image_url', p.image_url)) FILTER (WHERE p.photo_id IS NOT NULL), '[]') AS photos
          FROM reports r
          LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
          LEFT JOIN categories cat ON r.category_id = cat.category_id
          LEFT JOIN offices off ON r.office_id = off.office_id
          LEFT JOIN statuses s ON r.status_id = s.status_id
          LEFT JOIN operators op ON r.assigned_to_operator_id = op.operator_id
          LEFT JOIN operators ext_op ON r.assigned_to_external_id = ext_op.operator_id
          LEFT JOIN companies comp ON ext_op.company_id = comp.company_id
          LEFT JOIN photos p ON r.report_id = p.report_id
          WHERE r.report_id = $1
          GROUP BY r.report_id, c.citizen_id, c.username, c.first_name, c.last_name, cat.name, off.name, s.name, op.operator_id, op.username, op.email, ext_op.operator_id, ext_op.username, ext_op.email, comp.company_id, comp.name
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
      assigned_to_operator: row.assigned_to_operator_id ? {
        id: row.assigned_to_operator_id,
        username: row.operator_username,
        email: row.operator_email
      } : null,
      assigned_to_external: row.assigned_to_external_id ? {
        id: row.assigned_to_external_id,
        username: row.external_operator_username,
        email: row.external_operator_email,
        company: row.external_company_name
      } : null,
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

// Assegna un mainteiner (operator) a un report
export const setMainteinerByReport = async (report_id, operator_id) => {
  const sql = `
    UPDATE reports
    SET assigned_to_external_id = $2,
        updated_at = NOW()
    WHERE report_id = $1
    RETURNING 
      report_id,
      assigned_to_external_id,
      title,
      status_id,
      updated_at
  `;

  try {
    const result = await pool.query(sql, [report_id, operator_id]);

    if (result.rows.length === 0) {
      return null; // Nessun report trovato con quell'ID
    }

    return result.rows[0];
  } catch (err) {
    throw err;
  }
};
