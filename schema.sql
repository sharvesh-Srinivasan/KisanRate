CREATE DATABASE IF NOT EXISTS kisanrate;
USE kisanrate;

CREATE TABLE crops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_hindi VARCHAR(100),
  name_telugu VARCHAR(100),
  unit VARCHAR(20) DEFAULT 'Quintal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mandis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crop_id INT,
  mandi_id INT,
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  modal_price DECIMAL(10,2),
  predicted_price DECIMAL(10,2),
  predicted_lower DECIMAL(10,2),
  predicted_upper DECIMAL(10,2),
  predicted_at DATETIME,
  price_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (crop_id) REFERENCES crops(id),
  FOREIGN KEY (mandi_id) REFERENCES mandis(id),
  UNIQUE KEY unique_price_entry (crop_id, mandi_id, price_date)
);

CREATE TABLE farmers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  preferred_crop_id INT,
  preferred_mandi_id INT,
  subscribed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (preferred_crop_id) REFERENCES crops(id),
  FOREIGN KEY (preferred_mandi_id) REFERENCES mandis(id)
);

CREATE TABLE whatsapp_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20),
  incoming_message TEXT,
  outgoing_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
