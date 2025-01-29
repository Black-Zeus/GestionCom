CREATE TABLE statuses (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for the status
    name VARCHAR(50) NOT NULL UNIQUE, -- Name of the status
    description VARCHAR(255) DEFAULT NULL, -- Description of the status
    module VARCHAR(50) NOT NULL, -- Module to which the status belongs
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
    createdBy INT DEFAULT NULL, -- ID of the user who created the record
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last update timestamp
    updatedBy INT DEFAULT NULL, -- ID of the user who last modified the record
    deletedAt DATETIME DEFAULT NULL, -- Soft delete timestamp
    deletedBy INT DEFAULT NULL -- ID of the user who performed the deletion
) ENGINE=InnoDB;

-- Índices adicionales
CREATE INDEX idx_module_statuses ON statuses (module);
CREATE INDEX idx_deletedAt_statuses ON statuses (deletedAt);

CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for the profile
    name VARCHAR(50) NOT NULL UNIQUE, -- Name of the profile
    description VARCHAR(255) DEFAULT NULL, -- Description of the profile
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
    createdBy INT DEFAULT NULL, -- ID of the user who created the record
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last update timestamp
    updatedBy INT DEFAULT NULL, -- ID of the user who last modified the record
    deletedAt DATETIME DEFAULT NULL, -- Soft delete timestamp
    deletedBy INT DEFAULT NULL -- ID of the user who performed the deletion
) ENGINE=InnoDB;

-- Índices adicionales
CREATE INDEX idx_deletedAt_profiles ON profiles (deletedAt);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for the user
    firstName VARCHAR(100) NOT NULL, -- User's first name
    lastName VARCHAR(150) NOT NULL, -- User's last name
    email VARCHAR(150) NOT NULL UNIQUE, -- Unique email address
    password VARCHAR(255) NOT NULL, -- Encrypted password
    secretJwt VARCHAR(255), -- Field for associated JWT
    image VARCHAR(255) DEFAULT NULL, -- File name or path of the user's image
    phone VARCHAR(20) DEFAULT NULL, -- User's phone number
    gender ENUM('male', 'female', 'other') DEFAULT NULL, -- User's gender
    address VARCHAR(255) DEFAULT NULL, -- User's address
    statusId INT NOT NULL, -- Foreign key to statuses table
    profileId INT NOT NULL, -- Foreign key to profiles table
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
    createdBy INT DEFAULT NULL, -- ID of the user who created the record
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last update timestamp
    updatedBy INT DEFAULT NULL, -- ID of the user who last modified the record
    deletedAt DATETIME DEFAULT NULL, -- Soft delete timestamp
    deletedBy INT DEFAULT NULL, -- ID of the user who performed the deletion,
    CONSTRAINT fkStatus FOREIGN KEY (statusId) REFERENCES statuses (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fkProfile FOREIGN KEY (profileId) REFERENCES profiles (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Índices adicionales
CREATE INDEX idx_statusId_users ON users (statusId);
CREATE INDEX idx_profileId_users ON users (profileId);
CREATE INDEX idx_deletedAt_users ON users (deletedAt);

CREATE TABLE branches (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for the branch
    name VARCHAR(150) NOT NULL, -- Name of the branch
    address VARCHAR(255) NOT NULL, -- Address of the branch
    statusId INT NOT NULL, -- Foreign key to statuses table
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Creation timestamp
    createdBy INT DEFAULT NULL, -- ID of the user who created the record
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Last update timestamp
    updatedBy INT DEFAULT NULL, -- ID of the user who last modified the record
    deletedAt DATETIME DEFAULT NULL, -- Soft delete timestamp
    deletedBy INT DEFAULT NULL, -- ID of the user who performed the deletion
    CONSTRAINT fkBranchStatus FOREIGN KEY (statusId) REFERENCES statuses (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Índices adicionales
CREATE INDEX idx_statusId_branches ON branches (statusId);
CREATE INDEX idx_deletedAt_branches ON branches (deletedAt);

CREATE TABLE user_branches (
    id INT AUTO_INCREMENT PRIMARY KEY, -- Unique identifier for the relationship
    userId INT NOT NULL, -- Foreign key to users table
    branchId INT NOT NULL, -- Foreign key to branches table
    assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp when the branch was assigned
    CONSTRAINT fkUserBranchUser FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fkUserBranchBranch FOREIGN KEY (branchId) REFERENCES branches (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Índices adicionales
CREATE INDEX idx_userId_userBranches ON user_branches (userId);
CREATE INDEX idx_branchId_userBranches ON user_branches (branchId);
