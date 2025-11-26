CREATE TABLE citizens (
    citizen_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    profile_photo_url TEXT,
    telegram_username VARCHAR(100),
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE offices (
    office_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    office_id INT REFERENCES offices(office_id)
);

CREATE TABLE statuses (
    status_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE operators (
    operator_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    office_id INT REFERENCES offices(office_id),
    role_id INT REFERENCES roles(role_id) NOT NULL
);

CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    citizen_id INT REFERENCES citizens(citizen_id),
    category_id INT REFERENCES categories(category_id),
    office_id INT REFERENCES offices(office_id),
    status_id INT REFERENCES statuses(status_id),
    assigned_to_operator_id INT REFERENCES operators(operator_id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    anonymous BOOLEAN DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE photos (
    photo_id SERIAL PRIMARY KEY,
    report_id INT REFERENCES reports(report_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    report_id INT REFERENCES reports(report_id) ON DELETE CASCADE,
    operator_id INT REFERENCES operators(operator_id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    report_id INT REFERENCES reports(report_id) ON DELETE CASCADE,
    sender_type VARCHAR(10) CHECK (sender_type IN ('citizen','operator')),
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    citizen_id INT REFERENCES citizens(citizen_id),
    report_id INT REFERENCES reports(report_id),
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    seen BOOLEAN DEFAULT FALSE
);

CREATE TABLE telegram_users (
    telegram_user_id SERIAL PRIMARY KEY,
    citizen_id INT UNIQUE REFERENCES citizens(citizen_id),
    chat_id BIGINT UNIQUE NOT NULL,
    linked_at TIMESTAMP DEFAULT NOW()
);


-- 1. Offices
INSERT INTO offices (name, description) VALUES
('Organization Office', 'Preliminary verification and approval of reports'),
('Water Department', 'Manages water supply and drinking water issues'),
('Accessibility Office', 'Handles architectural barriers'),
('Sewage Department', 'Manages sewer system problems'),
('Lighting Department', 'Handles public lighting issues'),
('Waste Management', 'Manages waste collection and disposal'),
('Traffic Department', 'Handles road signs and traffic lights'),
('Public Works', 'Manages roads and urban furnishings'),
('Parks Department', 'Manages public green areas and playgrounds'),
('General Services', 'Handles miscellaneous issues');

-- 2. Categories
INSERT INTO categories (name, office_id) VALUES
('Water Supply – Drinking Water', (SELECT office_id FROM offices WHERE name = 'Water Department')),
('Architectural Barriers', (SELECT office_id FROM offices WHERE name = 'Accessibility Office')),
('Sewer System', (SELECT office_id FROM offices WHERE name = 'Sewage Department')),
('Public Lighting', (SELECT office_id FROM offices WHERE name = 'Lighting Department')),
('Waste', (SELECT office_id FROM offices WHERE name = 'Waste Management')),
('Road Signs and Traffic Lights', (SELECT office_id FROM offices WHERE name = 'Traffic Department')),
('Roads and Urban Furnishings', (SELECT office_id FROM offices WHERE name = 'Public Works')),
('Public Green Areas and Playgrounds', (SELECT office_id FROM offices WHERE name = 'Parks Department')),
('Other', (SELECT office_id FROM offices WHERE name = 'General Services'));

-- 3. Statuses
INSERT INTO statuses (name) VALUES
('Pending Approval'),
('Assigned'),
('In Progress'),
('Suspended'),
('Rejected'),
('Resolved');

-- 4. Roles
INSERT INTO roles (name, description) VALUES
('Admin', 'Administrator with full system access and user management capabilities'),
('Municipal public relations officer', 'Handles preliminary report verification and approval/rejection'),
('Technical office staff member', 'Manages assigned reports, updates status, and resolves issues'),
('Municipal administrator', 'Studies statistics');


-- Funzione per controllare email duplicate tra citizens e operators
CREATE OR REPLACE FUNCTION check_email_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'citizens' THEN
        IF EXISTS (SELECT 1 FROM operators WHERE email = NEW.email) THEN
            RAISE EXCEPTION USING
                MESSAGE = format('Email already in use: %s', NEW.email),
                ERRCODE = '23505';
        END IF;
    ELSIF TG_TABLE_NAME = 'operators' THEN
        IF EXISTS (SELECT 1 FROM citizens WHERE email = NEW.email) THEN
            RAISE EXCEPTION USING
                MESSAGE = format('Email already in use: %s', NEW.email),
                ERRCODE = '23505';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger su citizens
CREATE TRIGGER check_email_on_citizens
BEFORE INSERT OR UPDATE ON citizens
FOR EACH ROW
EXECUTE FUNCTION check_email_uniqueness();

-- Trigger su operators
CREATE TRIGGER check_email_on_operators
BEFORE INSERT OR UPDATE ON operators
FOR EACH ROW
EXECUTE FUNCTION check_email_uniqueness();


-- 4. Operatore admin
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id)
VALUES (
  'admin@participium.local',
  'admin',
  'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af',
  '4c999d4a2a78113f997cc7fd2cd05043',
  (SELECT office_id FROM offices WHERE name = 'Organization Office'),
  (SELECT role_id FROM roles WHERE name = 'Admin')
);

-- 5. Operatori: 2 per ogni ufficio (tranne organization office che non ha il tecnico)
-- Organization Office
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.org@participium.local', 'off_organization', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Organization Office'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer'));


-- Water Department
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.water@participium.local', 'off_water', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Water Department'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.water@participium.local', 'tec_water', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Water Department'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Accessibility Office
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.accessibility@participium.local', 'off_accessibility', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Accessibility Office'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.accessibility@participium.local', 'tec_accessibility', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Accessibility Office'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Sewage Department
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.sewage@participium.local', 'off_sewage', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Sewage Department'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.sewage@participium.local', 'tec_sewage', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Sewage Department'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Lighting Department
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.lighting@participium.local', 'off_lighting', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Lighting Department'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.lighting@participium.local', 'tec_lighting', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Lighting Department'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Waste Management
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.waste@participium.local', 'off_waste', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Waste Management'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.waste@participium.local', 'tec_waste', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Waste Management'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Traffic Department
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.traffic@participium.local', 'off_traffic', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Traffic Department'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.traffic@participium.local', 'tec_traffic', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Traffic Department'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Public Works
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.publicworks@participium.local', 'off_publicworks', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Public Works'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.publicworks@participium.local', 'tec_publicworks', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Public Works'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- Parks Department
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.parks@participium.local', 'off_parks', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Parks Department'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.parks@participium.local', 'tec_parks', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'Parks Department'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- General Services
INSERT INTO operators (email, username, password_hash, salt, office_id, role_id) VALUES
('off.general@participium.local', 'off_general', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'General Services'), 
  (SELECT role_id FROM roles WHERE name = 'Municipal public relations officer')),
('tec.general@participium.local', 'tec_general', 'f746cd28ba22bc7f3bbd4f62f152180f17236d0463d70888c4881d154c7526af', '4c999d4a2a78113f997cc7fd2cd05043', 
  (SELECT office_id FROM offices WHERE name = 'General Services'), 
  (SELECT role_id FROM roles WHERE name = 'Technical office staff member'));

-- 6. Citizen test
INSERT INTO citizens (email, username, first_name, last_name, password_hash, salt, profile_photo_url, telegram_username, email_notifications) VALUES
('melo@participium.local', 'melo', 'Carmelo', 'Locali', '858461e61ed6a0863bb44c4541e7bdcb33f9dd8d4401095ea6016bb4645b1239', '50ca648a1d5bbd29454d4a19efd9775b', NULL, NULL, TRUE);

-- 7. Test report
-- 1️⃣ Close reports cluster (around central area)
WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Architectural Barriers'),
        (SELECT office_id FROM offices WHERE name='Accessibility Office'),
        (SELECT status_id FROM statuses WHERE name='Pending Approval'),
        NULL,
        'Broken mobile stairs and inaccessible stairs',
        'The escalators are not functioning and the elevator is out of service, making access impossible.',
        45.063231, 7.659270,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, url
FROM new_report nr,
LATERAL (VALUES
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/scale_mobili_2.jpg'),
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/scale_mobili1.jpg')
) AS t(url);


WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Sewer System'),
        (SELECT office_id FROM offices WHERE name='Sewage Department'),
        (SELECT status_id FROM statuses WHERE name='Pending Approval'),
        NULL,
        'Working on sewage overflow',
        'Replacing damaged pipes causing sewage overflow in the street.',
        45.063215, 7.659258,  -- Close to first report
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, url
FROM new_report nr,
LATERAL (VALUES
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/swage_report.jpg'),
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/sewage2.jpg'),
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/sewage3.jpg')
) AS t(url);


WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Public Lighting'),
        (SELECT office_id FROM offices WHERE name='Lighting Department'),
        (SELECT status_id FROM statuses WHERE name='Pending Approval'),
        NULL,
        'Streetlight completely broken',
        'The streetlight has been off for several days, the area is very dark at night.',
        45.063248, 7.659290,  -- Close to the first two
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, 'https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/lampione_rotto.jpg'
FROM new_report nr;

-- 2️⃣ Spread out reports across the city
WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Waste'),
        (SELECT office_id FROM offices WHERE name='Waste Management'),
        (SELECT status_id FROM statuses WHERE name='In Progress'),
        (SELECT operator_id FROM operators WHERE username='tec_waste'),
        'Overflowing trash container',
        'Trash is not being collected and bags are piling up around the container.',
        45.070500, 7.661200,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, 'https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/waste_report.jpg'
FROM new_report nr;

WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Road Signs and Traffic Lights'),
        (SELECT office_id FROM offices WHERE name='Traffic Department'),
        (SELECT status_id FROM statuses WHERE name='In Progress'),
        (SELECT operator_id FROM operators WHERE username='tec_traffic'),
        'Broken traffic light',
        'Traffic light is broken and causing confusion at the intersection.',
        45.063611, 7.677467,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, url
FROM new_report nr,
LATERAL (VALUES
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/semafooro_rotto.jpg'),
    ('https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/semaforo2.jpg')
) AS t(url);

WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Roads and Urban Furnishings'),
        (SELECT office_id FROM offices WHERE name='Public Works'),
        (SELECT status_id FROM statuses WHERE name='Resolved'),
        (SELECT operator_id FROM operators WHERE username='tec_publicworks'),
        'Pothole in the road',
        'The road is broken and needs to be repaired to ensure safety.',
        45.064250, 7.680255,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, 'https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/roadworks_report.jpg'
FROM new_report nr;

WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Public Green Areas and Playgrounds'),
        (SELECT office_id FROM offices WHERE name='Parks Department'),
        (SELECT status_id FROM statuses WHERE name='Assigned'),
        (SELECT operator_id FROM operators WHERE username='tec_parks'),
        'Fallen tree blocking path',
        'A large tree has fallen and is blocking the pedestrian walkway.',
        45.073415, 7.663635,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, 'https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/fallen_tree.png'
FROM new_report nr;

WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Other'),
        (SELECT office_id FROM offices WHERE name='General Services'),
        (SELECT status_id FROM statuses WHERE name='Suspended'),
        (SELECT operator_id FROM operators WHERE username='tec_general'),
        'Broken information screen',
        'The municipal electronic info-panel is not working and shows only static.',
        45.079649, 7.660552,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, 'https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/schermo_rotto_1.jpg'
FROM new_report nr;

WITH new_report AS (
    INSERT INTO reports (
        citizen_id, category_id, office_id, status_id,
        assigned_to_operator_id, title, description,
        latitude, longitude, anonymous
    ) VALUES (
        (SELECT citizen_id FROM citizens WHERE email='melo@participium.local'),
        (SELECT category_id FROM categories WHERE name='Water Supply – Drinking Water'),
        (SELECT office_id FROM offices WHERE name='Water Department'),
        (SELECT status_id FROM statuses WHERE name='Assigned'),
        (SELECT operator_id FROM operators WHERE username='tec_water'),
        'Broken public fountain',
        'The public drinking fountain is not working. Water flow has completely stopped.',
        45.081651, 7.663635,
        FALSE
    )
    RETURNING report_id
)
INSERT INTO photos (report_id, image_url)
SELECT nr.report_id, 'https://vxofqxupvztswwxksllp.supabase.co/storage/v1/object/public/Reports/fontana_rotta.jpg'
FROM new_report nr;
