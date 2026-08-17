-- ==========================================
-- 1. TABLES (Safe Creation)
-- ==========================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    college VARCHAR(255) DEFAULT NULL,
    major VARCHAR(255) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'creator')),
    is_contributor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_number VARCHAR(50) DEFAULT NULL,
    category VARCHAR(50) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE qrcode (
    qr_id SERIAL PRIMARY KEY,
    pdf_path VARCHAR(500) NOT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    plant_id VARCHAR(50) REFERENCES plants(plant_id) ON DELETE SET NULL;
);

CREATE TABLE plants (
    plant_id VARCHAR(50) PRIMARY KEY, -- Changed from SERIAL to VARCHAR to support 'OP-101', etc.
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    common_name_en VARCHAR(255) DEFAULT NULL,
    common_name_ar VARCHAR(255) DEFAULT NULL,
    scientific_name VARCHAR(255) NOT NULL,
    image_path VARCHAR(500) DEFAULT NULL,
    quantity INT DEFAULT 0,
    category VARCHAR(100) DEFAULT NULL,
    lifecycle VARCHAR(100) DEFAULT NULL,
    water_required VARCHAR(50) DEFAULT NULL,
    sun_required VARCHAR(100) DEFAULT NULL,
    height VARCHAR(100) DEFAULT NULL, 
    spread VARCHAR(100) DEFAULT NULL, 
    shade BOOLEAN DEFAULT FALSE, 
    waste VARCHAR(100) DEFAULT NULL,
    evaporation_mitigation BOOLEAN DEFAULT NULL,
    root_type VARCHAR(100) DEFAULT NULL,
    drought_tolerance VARCHAR(50) DEFAULT NULL,
    heat_tolerance VARCHAR(50) DEFAULT NULL,
    bloom VARCHAR(150) DEFAULT NULL,
    environmental_impact VARCHAR(255) DEFAULT NULL,
    oxygen_production VARCHAR(150) DEFAULT NULL,
    carbon_dioxide_absorption VARCHAR(150) DEFAULT NULL,
    class VARCHAR(20) CHECK (class IN ('indoor', 'outdoor')),
    qr_image BYTEA DEFAULT NULL,
    qr_id INT REFERENCES qrcode(qr_id) ON DELETE SET NULL
);

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    description_en TEXT DEFAULT NULL,
    description_ar TEXT DEFAULT NULL,
    image_before_path VARCHAR(500) DEFAULT NULL,
    image_proposal_path VARCHAR(500) DEFAULT NULL,
    image_after_path VARCHAR(500) DEFAULT NULL,
    video_proposal_link VARCHAR(500) DEFAULT NULL, 
    pdf_path VARCHAR(500) DEFAULT NULL,
    project_status VARCHAR(20) DEFAULT 'unknown' CHECK (project_status IN ('unknown', 'in progress', 'planning', 'completed'))                  
);

CREATE TABLE records (
    record_id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    year INT NOT NULL,
    action_en VARCHAR(255) NOT NULL,
    action_ar VARCHAR(255) NOT NULL,
    area NUMERIC(12,2) DEFAULT NULL,
    green_area NUMERIC(12,2) DEFAULT NULL,
    number_of_trees INT DEFAULT 0,
    previous_condition_en TEXT DEFAULT NULL,
    current_condition_en TEXT DEFAULT NULL,
    previous_condition_ar TEXT DEFAULT NULL,
    current_condition_ar TEXT DEFAULT NULL,
    status VARCHAR(50) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    expected_end_date DATE DEFAULT NULL,
    estimated_cost NUMERIC(15,3) DEFAULT NULL,
    notes_en TEXT DEFAULT NULL,
    notes_ar TEXT DEFAULT NULL
);

CREATE TABLE news (
    news_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL,
    link VARCHAR(500) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    news_description_en TEXT DEFAULT NULL,
    news_description_ar TEXT DEFAULT NULL,
    SDGs VARCHAR(255) NOT NULL
);

-- Fixed table name typo and added missing JSONB audit columns used by the trigger function
CREATE TABLE activity_log (
    log_id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    row_id TEXT NOT NULL, -- Changed to TEXT to safely accommodate string primary keys like plant_id
    table_name VARCHAR(100) NOT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE annual_reports (
    report_id SERIAL PRIMARY KEY,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    report_year INT NOT NULL,
    pdf_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contributors (
    contributor_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    college VARCHAR(255) DEFAULT NULL,
    major VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS costs (
    cost_id SERIAL PRIMARY KEY,
    reference_type VARCHAR(50) NOT NULL, 
    reference_name VARCHAR(100) NOT NULL, 
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats_archive (
    stat_id SERIAL PRIMARY KEY,
    report_year INT NOT NULL UNIQUE,
    total_users INT DEFAULT 0,
    total_oxygen_units NUMERIC(10, 2) DEFAULT 0,
    total_water_waste_units NUMERIC(10, 2) DEFAULT 0,
    eco_friendly_score NUMERIC(5, 2) DEFAULT 0,
    total_financial_cost NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. FUNCTIONS (Safe Replacement)
-- ==========================================

-- QR Nullify Function
CREATE OR REPLACE FUNCTION nullify_plant_qr_image()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE plants
    SET qr_image = NULL,
        qr_id = NULL
    WHERE qr_id = OLD.qr_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Logging Function
CREATE OR REPLACE FUNCTION log_table_changes_func()
RETURNS TRIGGER AS $$
DECLARE
    row_id_val INT;
    old_data JSONB := NULL;
    new_data JSONB := NULL;
    current_user_val INT := NULL;
    pk_column TEXT;
    setting_val TEXT;
    table_name_val TEXT;
BEGIN
    BEGIN
        setting_val := current_setting('app.current_user_id', true);
        IF setting_val IS NOT NULL AND setting_val <> '' THEN
            current_user_val := setting_val::INT;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        current_user_val := NULL;
    END;

    table_name_val := TG_TABLE_NAME;

    pk_column := CASE table_name_val
        WHEN 'users' THEN 'user_id'
        WHEN 'locations' THEN 'location_id'
        WHEN 'qrcode' THEN 'qr_id'
        WHEN 'plants' THEN 'plant_id'
        WHEN 'projects' THEN 'project_id'
        WHEN 'records' THEN 'record_id'
        WHEN 'news' THEN 'news_id'
        WHEN 'annual_reports' THEN 'report_id'
        WHEN 'contributors' THEN 'contributor_id'
        WHEN 'costs' THEN 'cost_id'
        WHEN 'stats_archive' THEN 'stat_id'
        ELSE 'id'
    END;

    IF (TG_OP = 'INSERT') THEN
        new_data := to_jsonb(NEW);
        EXECUTE format('SELECT $1.%I', pk_column) USING NEW INTO row_id_val;
        
        INSERT INTO activity_log (action_type, table_name, row_id, new_values, created_by, created_at)
        VALUES ('INSERT', table_name_val, COALESCE(row_id_val, 0), new_data, current_user_val, NOW());
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        EXECUTE format('SELECT $1.%I', pk_column) USING NEW INTO row_id_val;
        
        INSERT INTO activity_log (action_type, table_name, row_id, old_values, new_values, created_by, created_at)
        VALUES ('UPDATE', table_name_val, COALESCE(row_id_val, 0), old_data, new_data, current_user_val, NOW());
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        old_data := to_jsonb(OLD);
        EXECUTE format('SELECT $1.%I', pk_column) USING OLD INTO row_id_val;
        
        INSERT INTO activity_log (action_type, table_name, row_id, old_values, created_by, created_at)
        VALUES ('DELETE', table_name_val, COALESCE(row_id_val, 0), old_data, current_user_val, NOW());
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TRIGGERS (Safe Re-creation)
-- ==========================================

DROP TRIGGER IF EXISTS trg_nullify_qr_image_on_delete ON qrcode;
CREATE TRIGGER trg_nullify_qr_image_on_delete
AFTER DELETE ON qrcode
FOR EACH ROW
EXECUTE FUNCTION nullify_plant_qr_image();

DROP TRIGGER IF EXISTS audit_plants_changes ON plants;
CREATE TRIGGER audit_plants_changes AFTER INSERT OR UPDATE OR DELETE ON plants FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_projects_changes ON projects;
CREATE TRIGGER audit_projects_changes AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_locations_changes ON locations;
CREATE TRIGGER audit_locations_changes AFTER INSERT OR UPDATE OR DELETE ON locations FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_users_changes ON users;
CREATE TRIGGER audit_users_changes AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_news_changes ON news;
CREATE TRIGGER audit_news_changes AFTER INSERT OR UPDATE OR DELETE ON news FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_records_changes ON records;
CREATE TRIGGER audit_records_changes AFTER INSERT OR UPDATE OR DELETE ON records FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_qrcode_changes ON qrcode;
CREATE TRIGGER audit_qrcode_changes AFTER INSERT OR UPDATE OR DELETE ON qrcode FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_contributors_changes ON contributors;
CREATE TRIGGER audit_contributors_changes AFTER INSERT OR UPDATE OR DELETE ON contributors FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_costs_changes ON costs;
CREATE TRIGGER audit_costs_changes AFTER INSERT OR UPDATE OR DELETE ON costs FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

DROP TRIGGER IF EXISTS audit_annual_reports_changes ON annual_reports;
CREATE TRIGGER audit_annual_reports_changes AFTER INSERT OR UPDATE OR DELETE ON annual_reports FOR EACH ROW EXECUTE FUNCTION log_table_changes_func();

-- ==========================================
-- 1. NOTIFICATIONS & PREFERENCES TABLES
-- ==========================================

CREATE TABLE user_notification_settings (
    user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    receive_all BOOLEAN DEFAULT TRUE,
    mute_all BOOLEAN DEFAULT FALSE,
    notify_system BOOLEAN DEFAULT TRUE,
    notify_updates BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- In-app Notification Bell Feed
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('message', 'status_change', 'deadline', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. MESSAGING & CALENDAR (DEADLINES / MEETINGS)
-- ==========================================

-- Messages Table (with optional Outlook tracking reference)
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    outlook_message_id VARCHAR(255) DEFAULT NULL, -- For future Microsoft Graph API sync
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calendar & Deadlines (Collaborative between Admin and Creator)
CREATE TABLE calendar_events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    event_type VARCHAR(50) CHECK (event_type IN ('meeting', 'task')),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_soon', 'completed', 'expired')),
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_personal BOOLEAN DEFAULT TRUE,
    assigned_to INT REFERENCES users(user_id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE;
);

/*Dummy Data*/
INSERT INTO users (username, email, college, major, password_hash, role, is_contributor, updated_by) VALUES
('Dr. Ali Ahmed', 'a.ahmed@uob.edu.bh', NULL, NULL, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin', TRUE, NULL),
('Sarah Al-Mansoori', '202809102@stu.uob.edu.bh', 'College of Information Technology', 'Software Engineering', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE, NULL),
('Khalil Ali', '202805102@stu.uob.edu.bh', 'College of Information Technology', 'Computer Science', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE, NULL),
('Hawra Abdulla', '202806102@stu.uob.edu.bh', 'College of Science', 'Biology', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE, NULL),
('Jassim Hassan', '202807102@stu.uob.edu.bh', 'College of Engineering', 'Landscape Architecture', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', FALSE, NULL);

INSERT INTO locations (location_number, category, name_en, name_ar, latitude, longitude, created_by, updated_by) VALUES
('S1A', 'building', 'College of Arts', 'كلية الآداب', 26.05128300, 50.51433110, 1, NULL),
('S3', 'facility', 'Central Library', 'المكتبة المركزية', 26.05111800, 50.51336600, 1, NULL),
(NULL, 'roadside', 'Flag Roundabout-Fountain', 'دوار العلم-النافورة', 26.053722, 50.510222, 1, NULL),
(NULL, 'park', 'Student Parking–Western Gate', 'موقف سيارات الطلاب-البوابة الغربية', 26.049357, 50.506854, 1, NULL),
(NULL, 'gate', 'Main Gate', 'البوابة الرئيسية', 26.056430, 50.508893, 1, NULL),
(NULL, 'infrastructure', 'Inner Fence', 'السور الداخلي', 26.057222, 50.510361, 1, NULL);

-- Insert QR code first so it can be referenced by the plant if needed
INSERT INTO qrcode (pdf_path, created_by) 
VALUES ('uploads/plants pdf/dummy_test.pdf', 1);

INSERT INTO plants (
    plant_id, location_id, created_by, updated_by, common_name_en, common_name_ar, scientific_name, 
    image_path, quantity, category, lifecycle, water_required, sun_required, 
    height, spread, shade, waste, evaporation_mitigation, root_type, 
    drought_tolerance, heat_tolerance, bloom, environmental_impact, 
    oxygen_production, carbon_dioxide_absorption, class, qr_id
) VALUES
(
    'OP-101', 5, 5, NULL, 'Date Palm', 'نخلة البلح', 'Phoenix dactylifera', 
    'uploads/plants/outdoor/date_palm.jpg', 15, 'tree', 'perennial', 'low', 'full sun', 
    '10.0-15.0 m', '3.0-5.0 m', TRUE, 'low', TRUE, 'deep taproot', 
    'high', 'high', 'no', 'high', 
    'High', '120000 g/year', 'outdoor', 1
),
(
    'OP-102', 3, 5, 3, 'Bougainvillea', 'جهنمية', 'Bougainvillea spectabilis', 
    'uploads/plants/bougainvillea.jpg', 30, 'shrub', 'perennial', 'medium', 'full sun', 
    '1.5-3.0 m', '2.0-4.0 m', FALSE, 'medium', FALSE, 'fibrous', 
    'high', 'high', 'seasonal', 'low', 
    'Medium', '45000 g/year', 'outdoor', NULL
),
(
    'IP-101', 1, 4, NULL, 'Peace Lily', 'زنبق السلام', 'Spathiphyllum wallisii', 
    'uploads/plants/peace_lily.jpg', 8, 'indoor plant', 'perennial', 'medium', 'partial shade', 
    '0.3-0.6 m', '0.3-0.5 m', TRUE, 'low', FALSE, 'fibrous', 
    'low', 'medium', 'Summer', 'medium', 
    'Low', '12000 g/year', 'indoor', NULL
);

INSERT INTO projects (
    location_id, created_by, updated_by, title_en, title_ar, description_en, description_ar, 
    image_before_path, image_proposal_path, image_after_path, video_proposal_link, pdf_path
) VALUES
(
    1, 4, 3, 
    'Native Tress', 
    'الأشجار المحلية',
    NULL,
    NULL,
    'uploads/projects/proposals/before/s1a-before.jpg', 'uploads/projects/proposals/proposal/s1a-proposal.jpg', 'uploads/projects/proposals/after/s1a-after.jpg',
    'https://www.youtube.com/watch?v=example123', 'uploads/projects/proposals/pdf/s1a-proposal.pdf'
),
(
    3, 3, NULL, 
    'Flag Roundabout Fountain', 
    'نافورة دوار العلم',
    'Remove harmful and random trees ',
    'إزالة الأشجار المؤذية والعشوائية',
    'uploads/projects/proposals/before/flag-before.jpg', 'uploads/projects/proposals/proposal/flag-proposal.jpg', NULL,
    'https://www.youtube.com/watch?v=example456', 'uploads/projects/proposals/pdf/flag-proposal.pdf'
);

INSERT INTO records (
    location_id, created_by, updated_by, year, action_en, action_ar, area, green_area, 
    number_of_trees, previous_condition_en, current_condition_en, previous_condition_ar, current_condition_ar, status, 
    start_date, expected_end_date, estimated_cost, notes_en, notes_ar
) VALUES
(
    6, 1, NULL, 2024, 
    'Planting ornamental trees', 
    'زراعة أشجار الزينة', 
    568, 568, 142,
    'Degraded or uncultivated landscape.', 
    'Re-landscaped with sustainable ornamental species enhancing ecological and visual value.',
    'أرض متدهورة أو غير مزروعة.', 
    'أعيد تصميم المناظر الطبيعية باستخدام أنواع نباتية زينة مستدامة تعزز القيمة البيئية والبصرية.', 
    NULL, NULL, NULL, NULL, 
    NULL, NULL
),
(
    4, 1, NULL, 2026, 
    'Tree planting for parking landscape', 
    'زراعة الأشجار لتنسيق الحدائق في مواقف السيارات', 
    NULL, NULL, 130, 
    'Uncultivated land.', 
    'Fully re-landscaped and planted.',
    'أرض غير مزروعة.', 
    'تمت إعادة تصميم وتنسيق الحدائق بالكامل.', 
    NULL, NULL, NULL, NULL, 
    'Improved parking landscape with green identity', 'تحسين تصميم مواقف السيارات مع مراعاة الطابع الأخضر'
);

INSERT INTO news (
    created_by, updated_by, link, title_en, title_ar, news_description_en, news_description_ar, SDGs
) VALUES
(
    1, NULL, 'https://www.instagram.com/reel/DYR4j9TNPGK/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==', 
    'National Campaign of Afforestation', 
    'الحملة الوطنية للتشجير', 
    'The National Initiative for Agricultural Sector Development extends its deepest gratitude and appreciation to everyone who contributed to planting a tree and nurturing hope in our homeland.', 
    'تتقدم المبادرة الوطنية لتنمية القطاع الزراعي بجزيل الشكر وعظيم الامتنان لكل من أسهم بعطائه في غرس شجرة، ومد جذور الأمل في أرض الوطن.', 
    'SDG 13, SDG 15'
);

INSERT INTO contributors (contributor_id, username, college, major)
SELECT user_id, username, college, major
FROM users
WHERE is_contributor = TRUE OR role = 'creator'
ON CONFLICT (contributor_id) DO NOTHING;

INSERT INTO costs (reference_type, reference_name, unit_cost) VALUES
('water_tier', 'Low', 0.50),  
('water_tier', 'Medium', 1.20),  
('water_tier', 'High', 2.50),    
('project', 'Campus Greenbelt Expansion', 12500.00),
('project', 'Arboretum Irrigation Retrofit', 8400.00),
('project', 'Botanical Courtyard Redesign', 5300.00)
ON CONFLICT DO NOTHING;

INSERT INTO stats_archive (report_year, total_users, total_oxygen_units, total_water_waste_units, eco_friendly_score, total_financial_cost)
VALUES (2026, 8, 662.5, 45.0, 85.4, 26200.00)
ON CONFLICT (report_year) DO NOTHING;