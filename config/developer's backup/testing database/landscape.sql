CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'creator')),
    is_contributor BOOLEAN DEFAULT FALSE
);

CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_number VARCHAR(50) DEFAULT NULL,
    category VARCHAR(50) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    latitude NUMERIC(10,8) NOT NULL,
    longitude NUMERIC(11,8) NOT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE plants (
    plant_id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
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
    class VARCHAR(20) CHECK (class IN ('indoor', 'outdoor'))
);

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    description_en TEXT DEFAULT NULL,
    description_ar TEXT DEFAULT NULL,
    image_before_path VARCHAR(500) DEFAULT NULL,
    image_proposal_path VARCHAR(500) DEFAULT NULL,
    image_after_path VARCHAR(500) DEFAULT NULL,
    video_proposal_link VARCHAR(500) DEFAULT NULL, 
    pdf_path VARCHAR(500) DEFAULT NULL             
);

CREATE TABLE records (
    record_id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    year INT NOT NULL,
    action_en VARCHAR(255) NOT NULL,
    action_ar VARCHAR(255) NOT NULL,
    area NUMERIC(12,2) DEFAULT NULL,
    green_area NUMERIC(12,2) DEFAULT NULL,
    number_of_trees INT DEFAULT 0,
    previous_condition TEXT DEFAULT NULL,
    current_condition TEXT DEFAULT NULL,
    status VARCHAR(50) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    expected_end_date DATE DEFAULT NULL,
    estimated_cost NUMERIC(15,3) DEFAULT NULL,
    notes_en TEXT DEFAULT NULL,
    notes_ar TEXT DEFAULT NULL
);

CREATE TABLE news (
    news_id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    link VARCHAR(500) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    news_description_en TEXT DEFAULT NULL,
    news_description_ar TEXT DEFAULT NULL,
    SDGs VARCHAR(255) NOT NULL
);

INSERT INTO users (username, email, password_hash, role, is_contributor) VALUES
('Dr. Ali Ahmed', 'a.ahmed@uob.edu.bh', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin', TRUE),
('Sarah Al-Mansoori', 's.almansoori@uob.edu.bh', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE),
('Jassim Hassan', 'j.hassan@uob.edu.bh', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', FALSE);

INSERT INTO locations (location_number, category, name_en, name_ar, latitude, longitude, created_by) VALUES
('S1A', 'academic', 'College of Information Technology', 'كلية تقنية المعلومات', 26.05051200, 50.51123400, 1),
('S40', 'facility', 'Central Student Park', 'حديقة الطلاب المركزية', 26.05210000, 50.51340000, 1),
(NULL, 'landscape', 'Main Entrance Green Belt', 'الحزام الأخضر للمدخل الرئيسي', 26.04890000, 50.50980000, 1);

INSERT INTO plants (
    location_id, created_by, common_name_en, common_name_ar, scientific_name, 
    image_path, quantity, category, lifecycle, water_required, sun_required, 
    height, spread, shade, waste, evaporation_mitigation, root_type, 
    drought_tolerance, heat_tolerance, bloom, environmental_impact, 
    oxygen_production, carbon_dioxide_absorption, class
) VALUES
(
    1, 2, 'Date Palm', 'نخلة البلح', 'Phoenix dactylifera', 
    'uploads/plants/date_palm.jpg', 15, 'tree', 'perennial', 'low', 'full sun', 
    '10.0-15.0 m', '3.0-5.0 m', TRUE, 'low', TRUE, 'deep taproot', 
    'high', 'high', 'Spring', 'Provides shade and natural cooling', 
    'High', '120 kg/year', 'outdoor'
),
(
    2, 2, 'Bougainvillea', 'جهنمية', 'Bougainvillea spectabilis', 
    'uploads/plants/bougainvillea.jpg', 30, 'shrub', 'perennial', 'medium', 'full sun', 
    '1.5-3.0 m', '2.0-4.0 m', FALSE, 'medium', FALSE, 'fibrous', 
    'high', 'high', 'Year-round', 'Enhances aesthetic diversity and pollinator attraction', 
    'Medium', '45 kg/year', 'outdoor'
),
(
    1, 3, 'Peace Lily', 'زنبق السلام', 'Spathiphyllum wallisii', 
    'uploads/plants/peace_lily.jpg', 8, 'indoor plant', 'perennial', 'medium', 'partial shade', 
    '0.3-0.6 m', '0.3-0.5 m', TRUE, 'low', FALSE, 'fibrous', 
    'low', 'medium', 'Summer', 'Purifies indoor air', 
    'Low', '12 kg/year', 'indoor'
);

INSERT INTO projects (
    location_id, created_by, title_en, title_ar, description_en, description_ar, 
    image_before_path, image_proposal_path, image_after_path, video_proposal_link, pdf_path
) VALUES
(
    1, 2, 
    'IT College Solar Shade & Green Courtyard', 
    'مشروع المظلات الشمسية والفناء الأخضر لكلية تقنية المعلومات',
    'Transformation of the IT inner courtyard into a climate-resilient green space with automated irrigation.',
    'تحويل الفناء الداخلي لكلية تقنية المعلومات إلى مساحة خضراء مقاومة للتغير المناخي مع نظام ري آلي.',
    'uploads/projects/it_before.jpg', 'uploads/projects/it_proposal.jpg', 'uploads/projects/it_after.jpg',
    'https://www.youtube.com/watch?v=example123', 'uploads/docs/it_courtyard_proposal.pdf'
),
(
    2, 3, 
    'S40 Smart Irrigation Expansion', 
    'توسعة نظام الري الذكي في S40',
    'Installation of smart soil moisture sensors and drought-tolerant groundcovers.',
    'تركيب أجهزة استشعار رطوبة التربة الذكية وتغطية النباتات المقاومة للجفاف.',
    'uploads/projects/s40_before.jpg', 'uploads/projects/s40_proposal.jpg', NULL,
    'https://www.youtube.com/watch?v=example456', 'uploads/docs/s40_expansion.pdf'
);

INSERT INTO records (
    location_id, created_by, year, action_en, action_ar, area, green_area, 
    number_of_trees, previous_condition, current_condition, status, 
    start_date, expected_end_date, estimated_cost, notes_en, notes_ar
) VALUES
(
    1, 1, 2025, 
    'Courtyard Soil Remediation & Tree Planting', 
    'استصلاح تربة الفناء وزراعة الأشجار', 
    450.00, 200.00, 15, 
    'Unused paved area with thermal heat retention.', 
    'Active green courtyard with drip irrigation.', 
    'Completed', '2025-02-01', '2025-05-15', 3500.000, 
    'Phase 1 finished within budget.', 'تمت المرحلة الأولى بنجاح ضمن الميزانية.'
),
(
    2, 1, 2026, 
    'Central Park Expansion', 
    'توسعة الحديقة المركزية', 
    1200.00, 850.00, 40, 
    'Open gravel terrain.', 
    'Landscaping and pathway installation in progress.', 
    'In Progress', '2026-01-10', '2026-11-30', 12500.000, 
    'Tree planting scheduled for autumn.', 'من المقرر زراعة الأشجار في فصل الخريف.'
);

INSERT INTO news (
    created_by, link, title_en, title_ar, news_description_en, news_description_ar, SDGs
) VALUES
(
    1, 'https://www.uob.edu.bh/news/green-campus-initiative-2026', 
    'UOB Launches Green Campus Initiative 2026', 
    'جامعة البحرين تطلق مبادرة الحرم الجامعي الأخضر 2026', 
    'University of Bahrain expands campus canopy area by 15% in alignment with national sustainability targets.', 
    'جامعة البحرين توسع مساحة الغطاء النباتي بالحرم الجامعي بنسبة 15% تماشياً مع أهداف التنمية المستدامة الوطنية.', 
    'SDG 13, SDG 15'
);