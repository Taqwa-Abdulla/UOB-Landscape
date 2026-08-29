-- ==========================================
-- 1. TABLES
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
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    location_image VARCHAR(500) DEFAULT NULL
);

-- Defined before plants to resolve strict execution order; foreign key added via ALTER TABLE below
CREATE TABLE qrcode (
    qr_id SERIAL PRIMARY KEY,
    pdf_path VARCHAR(500) NOT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    plant_id VARCHAR(50) DEFAULT NULL
);

CREATE TABLE plants (
    plant_id VARCHAR(50) PRIMARY KEY,
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

-- Resolve foreign key dependency back to plants
ALTER TABLE qrcode 
    ADD CONSTRAINT fk_qrcode_plants 
    FOREIGN KEY (plant_id) REFERENCES plants(plant_id) ON DELETE SET NULL;

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
    notes_ar TEXT DEFAULT NULL,
    pdf_path VARCHAR(500) DEFAULT NULL
);

CREATE TABLE news (
    news_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    link VARCHAR(500) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    news_description_en TEXT DEFAULT NULL,
    news_description_ar TEXT DEFAULT NULL,
    SDGs VARCHAR(255) NOT NULL
);

CREATE TABLE activity_log (
    log_id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    row_id TEXT NOT NULL, 
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

CREATE TABLE user_notification_settings (
    user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    receive_all BOOLEAN DEFAULT TRUE,
    mute_all BOOLEAN DEFAULT FALSE,
    notify_system BOOLEAN DEFAULT TRUE,
    notify_updates BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('message', 'status_change', 'deadline', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    outlook_message_id VARCHAR(255) DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    is_completed BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- 2. FUNCTIONS
-- ==========================================

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

CREATE OR REPLACE FUNCTION log_table_changes_func()
RETURNS TRIGGER AS $$
DECLARE
    row_id_val TEXT;
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

    IF current_user_val IS NULL THEN
        SELECT user_id INTO current_user_val 
        FROM users 
        WHERE LOWER(role) = 'creator' 
        LIMIT 1;
    END IF;

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
        EXECUTE format('SELECT ($1).%I::text', pk_column) USING NEW INTO row_id_val;
        
        INSERT INTO activity_log (action_type, table_name, row_id, new_values, created_by, created_at)
        VALUES ('INSERT', table_name_val, COALESCE(row_id_val, '0'), new_data, current_user_val, NOW());
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        EXECUTE format('SELECT ($1).%I::text', pk_column) USING NEW INTO row_id_val;
        
        INSERT INTO activity_log (action_type, table_name, row_id, old_values, new_values, created_by, created_at)
        VALUES ('UPDATE', table_name_val, COALESCE(row_id_val, '0'), old_data, new_data, current_user_val, NOW());
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        old_data := to_jsonb(OLD);
        EXECUTE format('SELECT ($1).%I::text', pk_column) USING OLD INTO row_id_val;
        
        INSERT INTO activity_log (action_type, table_name, row_id, old_values, created_by, created_at)
        VALUES ('DELETE', table_name_val, COALESCE(row_id_val, '0'), old_data, current_user_val, NOW());
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_system_notifications()
RETURNS TRIGGER AS $$
DECLARE
    target_user INT;
    notif_title VARCHAR(255);
    notif_msg TEXT;
    notif_type VARCHAR(50);
    actor_id INT;
BEGIN
    IF TG_TABLE_NAME = 'projects' THEN
        notif_type := 'status_change';
        actor_id := COALESCE(NEW.updated_by, NEW.created_by, -1);
        
        IF (TG_OP = 'INSERT') THEN
            notif_title := 'New Project Created';
            notif_msg := 'Project "' || NEW.title_en || '" has been added with status: ' || NEW.project_status;
        ELSIF (TG_OP = 'UPDATE' AND OLD.project_status IS DISTINCT FROM NEW.project_status) THEN
            notif_title := 'Project Status Updated';
            notif_msg := 'Project "' || NEW.title_en || '" status changed from ' || OLD.project_status || ' to ' || NEW.project_status;
        ELSE
            RETURN NEW;
        END IF;

        FOR target_user IN SELECT user_id FROM users WHERE user_id IS DISTINCT FROM actor_id LOOP
            INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
            VALUES (target_user, notif_title, notif_msg, notif_type, FALSE, NOW());
        END LOOP;

    ELSIF TG_TABLE_NAME = 'activity_log' THEN
        IF NEW.table_name IN ('plants', 'locations', 'news') THEN
            notif_type := 'system';
            -- Changed '+' to standard PostgreSQL '||' string concatenation
            notif_title := 'System Update: ' || INITCAP(NEW.table_name);
            notif_msg := 'A ' || NEW.action_type || ' action was performed on ' || NEW.table_name;
            actor_id := COALESCE(NEW.created_by, -1);

            FOR target_user IN SELECT user_id FROM users WHERE user_id IS DISTINCT FROM actor_id LOOP
                INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
                VALUES (target_user, notif_title, notif_msg, notif_type, FALSE, NOW());
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS trg_notify_project_changes ON projects;
CREATE TRIGGER trg_notify_project_changes
AFTER INSERT OR UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION generate_system_notifications();

DROP TRIGGER IF EXISTS trg_notify_activity_changes ON activity_log;
CREATE TRIGGER trg_notify_activity_changes
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION generate_system_notifications();

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