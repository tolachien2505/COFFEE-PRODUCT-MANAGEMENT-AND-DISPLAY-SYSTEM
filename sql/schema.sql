CREATE TABLE IF NOT EXISTS Categories (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(120) NOT NULL UNIQUE,
  Description VARCHAR(255) NULL,
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Products (
  Id INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(180) NOT NULL,
  Price DECIMAL(12, 2) NOT NULL,
  Description TEXT NOT NULL,
  Image_URL VARCHAR(600) NOT NULL,
  Category_Id INT NOT NULL,
  Status ENUM('in_stock', 'out_of_stock') NOT NULL DEFAULT 'in_stock',
  Created_At TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_categories
    FOREIGN KEY (Category_Id) REFERENCES Categories(Id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  INDEX idx_products_name (Name),
  INDEX idx_products_category (Category_Id),
  INDEX idx_products_status (Status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
