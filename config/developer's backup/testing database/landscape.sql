
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
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL
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
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL
);

CREATE TABLE plants (
    plant_id SERIAL PRIMARY KEY,
    location_id INT REFERENCES locations(location_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL,
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
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL DEFAULT NULL,
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

CREATE TABLE activitiy_log (
    log_id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    row_id INT NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SHA-256 passwords ('password123')

INSERT INTO users (username, email, college, major, password_hash, role, is_contributor, updated_by) VALUES
('Dr. Ali Ahmed', 'a.ahmed@uob.edu.bh', NULL, NULL, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'admin', TRUE, NULL),
('Sarah Al-Mansoori', '202809102@stu.uob.edu.bh', 'College of Information Technology', 'Software Engneering', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE, NULL),
('Khalil Ali', '202805102@stu.uob.edu.bh', 'College of Information Technology', 'Computer Science', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE, NULL),
('Hawra Abdulla', '202806102@stu.uob.edu.bh', 'College of Science', 'Biology', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', TRUE, NULL),
('Jassim Hassan', '202807102@stu.uob.edu.bh', 'College of Engneering', 'Landscape Architecture', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'creator', FALSE, NULL);

INSERT INTO locations (location_number, category, name_en, name_ar, latitude, longitude, created_by, updated_by) VALUES
('S1A', 'building', 'College of Arts', 'كلية الآداب', 26.05128300, 50.51433110, 1, NULL),
('S3', 'facility', 'Central Library', 'المكتبة المركزية', 26.05111800, 50.51336600, 1, NULL),
(NULL, 'roadside', 'Flag Roundabout-Fountain', 'دوار العلم-النافورة', 26.053722, 50.510222, 1, NULL),
(NULL, 'park', 'Student Parking–Western Gate', 'موقف سيارات الطلاب-البوابة الغربية', 26.049357, 50.506854, 1, NULL),
(NULL, 'gate', 'Main Gate', 'البوابة الرئيسية', 26.056430, 50.508893, 1, NULL),
(NULL, 'infrastructure', 'Inner Fence', 'السور الداخلي', 26.057222, 50.510361, 1, NULL);

INSERT INTO plants (
    location_id, created_by, updated_by, common_name_en, common_name_ar, scientific_name, 
    image_path, quantity, category, lifecycle, water_required, sun_required, 
    height, spread, shade, waste, evaporation_mitigation, root_type, 
    drought_tolerance, heat_tolerance, bloom, environmental_impact, 
    oxygen_production, carbon_dioxide_absorption, class
) VALUES
(
    5, 5, NULL, 'Date Palm', 'نخلة البلح', 'Phoenix dactylifera', 
    'uploads/plants/outdoor/date_palm.jpg', 15, 'tree', 'perennial', 'low', 'full sun', 
    '10.0-15.0 m', '3.0-5.0 m', TRUE, 'low', TRUE, 'deep taproot', 
    'high', 'high', 'no', 'high', 
    'High', '120000 g/year', 'outdoor'
),
(
    3, 5, 3, 'Bougainvillea', 'جهنمية', 'Bougainvillea spectabilis', 
    'uploads/plants/bougainvillea.jpg', 30, 'shrub', 'perennial', 'medium', 'full sun', 
    '1.5-3.0 m', '2.0-4.0 m', FALSE, 'medium', FALSE, 'fibrous', 
    'high', 'high', 'seasonal', 'low', 
    'Medium', '45000 g/year', 'outdoor'
),
(
    1, 4, NULL, 'Peace Lily', 'زنبق السلام', 'Spathiphyllum wallisii', 
    'uploads/plants/peace_lily.jpg', 8, 'indoor plant', 'perennial', 'medium', 'partial shade', 
    '0.3-0.6 m', '0.3-0.5 m', TRUE, 'low', FALSE, 'fibrous', 
    'low', 'medium', 'Summer', 'medium', 
    'Low', '12000 g/year', 'indoor'
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
    'uuploads/projects/proposals/before/flag-before.jpg', 'uploads/projects/proposals/proposal/flag-proposal.jpg', NULL,
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
    'The National Initiative for Agricultural Sector Development extends its deepest gratitude and appreciation to everyone who contributed to planting a tree and nurturing hope in our homeland.
These sincere efforts represent a milestone in the journey towards environmental sustainability, and their impact will forever testify to your awareness and dedication. May God grant you continued success. Through you, our nation flourishes, and its land remains green and vibrant.', 
    'تتقدم المبادرة الوطنية لتنمية القطاع الزراعي بجزيل الشكر وعظيم الامتنان لكل من أسهم بعطائه في غرس شجرة، ومد جذور الأمل في أرض الوطن.
إن هذه الجهود المخلصة تمثل علامة فارقة في مسيرة الاستدامة البيئية، وستظل آثارها شاهدة على وعيكم وحرصكم، وأجرها ممتد بإذن الله. فبكم يزهو الوطن، وتبقى أرضه خضراء نابضة بالحياة.', 
    'SDG 13, SDG 15'
);