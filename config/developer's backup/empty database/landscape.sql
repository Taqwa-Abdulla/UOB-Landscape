
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
    pdf_path VARCHAR(500) DEFAULT NULL             
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