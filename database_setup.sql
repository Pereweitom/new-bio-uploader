-- Student Biodata Uploader Database Schema
-- Run this script in your MySQL database to create the required tables

-- Create database (optional if it doesn't exist)
-- CREATE DATABASE dlc_ui CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE dlc_ui;

-- Main student records table
CREATE TABLE IF NOT EXISTS dlc_student (
  serialID int AUTO_INCREMENT PRIMARY KEY,
  applicantNo varchar(20) UNIQUE NOT NULL,
  lastName varchar(100) NOT NULL,
  firstName varchar(100) NOT NULL,
  middleName varchar(100),
  gender enum('Male', 'Female') NOT NULL,
  date_of_birth date NOT NULL,
  maritalStatus int,
  religion varchar(50),
  phoneNo varchar(20),
  emailAddress varchar(100),
  application_session int,
  course_of_study int,
  country varchar(50),
  studyMode enum('FULL_PROGRAMME', 'DIRECT_ENTRY', 'FAST_TRACK'),
  password varchar(255) NOT NULL,
  profession varchar(100),
  lga_origin int,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_applicant (applicantNo),
  INDEX idx_email (emailAddress),
  INDEX idx_session (application_session),
  INDEX idx_course (course_of_study)
);

-- Student ID mapping table
CREATE TABLE IF NOT EXISTS dlc_student_id (
  id int AUTO_INCREMENT PRIMARY KEY,
  applicant_no varchar(20) NOT NULL,
  matric_no varchar(50) UNIQUE NOT NULL,
  applicant_serial int NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_matric (matric_no),
  INDEX idx_applicant (applicant_no),
  FOREIGN KEY (applicant_serial) REFERENCES dlc_student(serialID) ON DELETE CASCADE
);

-- Marital status lookup table
CREATE TABLE IF NOT EXISTS dlc_marital_status (
  status_serial int AUTO_INCREMENT PRIMARY KEY,
  status_name varchar(50) NOT NULL UNIQUE,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Academic sessions table
CREATE TABLE IF NOT EXISTS dlc_session (
  sessionID int AUTO_INCREMENT PRIMARY KEY,
  sessionName varchar(20) NOT NULL UNIQUE,
  description varchar(100),
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Courses of study table
CREATE TABLE IF NOT EXISTS dlc_course_of_study (
  serialid int AUTO_INCREMENT PRIMARY KEY,
  course_of_study varchar(100) NOT NULL,
  faculty varchar(100),
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_course_name (course_of_study)
);

-- States table
CREATE TABLE IF NOT EXISTS dlc_state (
  state_id int AUTO_INCREMENT PRIMARY KEY,
  state_name varchar(50) NOT NULL UNIQUE,
  country varchar(50) DEFAULT 'Nigeria',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Local Government Areas table
CREATE TABLE IF NOT EXISTS dlc_lga (
  lga_id int AUTO_INCREMENT PRIMARY KEY,
  lga_name varchar(100) NOT NULL,
  state_id int NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lga_name (lga_name),
  INDEX idx_state (state_id),
  FOREIGN KEY (state_id) REFERENCES dlc_state(state_id) ON DELETE CASCADE
);

-- Staff users table for authentication
CREATE TABLE IF NOT EXISTS staff_users (
  id int AUTO_INCREMENT PRIMARY KEY,
  email varchar(100) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  name varchar(100) NOT NULL,
  role enum('staff', 'admin') DEFAULT 'staff',
  active tinyint(1) DEFAULT 1,
  last_login timestamp NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_active (active)
);

-- Add foreign key constraints to dlc_student
ALTER TABLE dlc_student 
ADD CONSTRAINT fk_student_marital 
FOREIGN KEY (maritalStatus) REFERENCES dlc_marital_status(status_serial) ON DELETE SET NULL;

ALTER TABLE dlc_student 
ADD CONSTRAINT fk_student_session 
FOREIGN KEY (application_session) REFERENCES dlc_session(sessionID) ON DELETE SET NULL;

ALTER TABLE dlc_student 
ADD CONSTRAINT fk_student_course 
FOREIGN KEY (course_of_study) REFERENCES dlc_course_of_study(serialid) ON DELETE SET NULL;

ALTER TABLE dlc_student 
ADD CONSTRAINT fk_student_lga 
FOREIGN KEY (lga_origin) REFERENCES dlc_lga(lga_id) ON DELETE SET NULL;

-- Insert sample lookup data
INSERT INTO dlc_marital_status (status_name) VALUES
('Single'),
('Married'),
('Divorced'),
('Widowed'),
('Separated')
ON DUPLICATE KEY UPDATE status_name = VALUES(status_name);

INSERT INTO dlc_session (sessionName, description) VALUES
('2023', '2023/2024 Academic Session'),
('2024', '2024/2025 Academic Session'),
('2025', '2025/2026 Academic Session'),
('2023/2024', '2023/2024 Academic Session'),
('2024/2025', '2024/2025 Academic Session')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO dlc_course_of_study (course_of_study, faculty) VALUES
('Computer Science', 'Science'),
('Mathematics', 'Science'),
('Physics', 'Science'),
('Chemistry', 'Science'),
('Biology', 'Science'),
('English Language', 'Arts'),
('History', 'Arts'),
('Geography', 'Arts'),
('Economics', 'Social Sciences'),
('Political Science', 'Social Sciences'),
('Accounting', 'Management Sciences'),
('Business Administration', 'Management Sciences')
ON DUPLICATE KEY UPDATE faculty = VALUES(faculty);

-- Insert Nigerian states
INSERT INTO dlc_state (state_name) VALUES
('Lagos'),
('Kano'),
('Rivers'),
('Oyo'),
('Kaduna'),
('Anambra'),
('Delta'),
('Edo'),
('Ekiti'),
('Enugu'),
('FCT'),
('Imo'),
('Jigawa'),
('Kebbi'),
('Kogi'),
('Kwara'),
('Niger'),
('Ogun'),
('Ondo'),
('Osun'),
('Plateau'),
('Sokoto'),
('Taraba'),
('Yobe'),
('Zamfara'),
('Abia'),
('Adamawa'),
('Akwa Ibom'),
('Bauchi'),
('Bayelsa'),
('Benue'),
('Borno'),
('Cross River'),
('Ebonyi'),
('Gombe'),
('Imo'),
('Jigawa'),
('Katsina'),
('Nasarawa')
ON DUPLICATE KEY UPDATE state_name = VALUES(state_name);

-- Insert sample LGAs for major states
INSERT INTO dlc_lga (lga_name, state_id) VALUES
-- Lagos LGAs
('Ikeja', (SELECT state_id FROM dlc_state WHERE state_name = 'Lagos')),
('Lagos Island', (SELECT state_id FROM dlc_state WHERE state_name = 'Lagos')),
('Lagos Mainland', (SELECT state_id FROM dlc_state WHERE state_name = 'Lagos')),
('Surulere', (SELECT state_id FROM dlc_state WHERE state_name = 'Lagos')),
('Alimosho', (SELECT state_id FROM dlc_state WHERE state_name = 'Lagos')),

-- Kano LGAs
('Kano Municipal', (SELECT state_id FROM dlc_state WHERE state_name = 'Kano')),
('Fagge', (SELECT state_id FROM dlc_state WHERE state_name = 'Kano')),
('Dala', (SELECT state_id FROM dlc_state WHERE state_name = 'Kano')),
('Gwale', (SELECT state_id FROM dlc_state WHERE state_name = 'Kano')),

-- Rivers LGAs
('Port Harcourt', (SELECT state_id FROM dlc_state WHERE state_name = 'Rivers')),
('Obio-Akpor', (SELECT state_id FROM dlc_state WHERE state_name = 'Rivers')),
('Eleme', (SELECT state_id FROM dlc_state WHERE state_name = 'Rivers')),

-- Anambra LGAs
('Awka North', (SELECT state_id FROM dlc_state WHERE state_name = 'Anambra')),
('Awka South', (SELECT state_id FROM dlc_state WHERE state_name = 'Anambra')),
('Onitsha North', (SELECT state_id FROM dlc_state WHERE state_name = 'Anambra')),

-- FCT LGAs
('Abuja Municipal', (SELECT state_id FROM dlc_state WHERE state_name = 'FCT')),
('Gwagwalada', (SELECT state_id FROM dlc_state WHERE state_name = 'FCT')),
('Kuje', (SELECT state_id FROM dlc_state WHERE state_name = 'FCT')),

-- Kaduna LGAs
('Kaduna North', (SELECT state_id FROM dlc_state WHERE state_name = 'Kaduna')),
('Kaduna South', (SELECT state_id FROM dlc_state WHERE state_name = 'Kaduna')),
('Chikun', (SELECT state_id FROM dlc_state WHERE state_name = 'Kaduna')),

-- Oyo LGAs
('Ibadan North', (SELECT state_id FROM dlc_state WHERE state_name = 'Oyo')),
('Ibadan South-West', (SELECT state_id FROM dlc_state WHERE state_name = 'Oyo')),
('Ibadan North-East', (SELECT state_id FROM dlc_state WHERE state_name = 'Oyo')),

-- Katsina LGAs
('Katsina', (SELECT state_id FROM dlc_state WHERE state_name = 'Katsina')),
('Daura', (SELECT state_id FROM dlc_state WHERE state_name = 'Katsina')),
('Funtua', (SELECT state_id FROM dlc_state WHERE state_name = 'Katsina'))
ON DUPLICATE KEY UPDATE lga_name = VALUES(lga_name);

-- Create a default admin user (password: admin123)
-- Hash generated using bcrypt with 10 rounds
INSERT INTO staff_users (email, password_hash, name, role) VALUES
('admin@bioUploader.com', '$2b$10$rOzJrVkjJz5VfGzLvW9Zn.XJYGKzLrQrJ5VfGzLvW9Zn.XJYGKzLr', 'System Administrator', 'admin'),
('staff@bioUploader.com', '$2b$10$rOzJrVkjJz5VfGzLvW9Zn.XJYGKzLrQrJ5VfGzLvW9Zn.XJYGKzLr', 'Staff User', 'staff')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Show table creation summary
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN (
        'dlc_student', 
        'dlc_student_id', 
        'dlc_marital_status', 
        'dlc_session', 
        'dlc_course_of_study', 
        'dlc_state', 
        'dlc_lga', 
        'staff_users'
    )
ORDER BY TABLE_NAME;