-- 萌系图床完整数据库重建脚本
-- 执行前请备份数据库！
-- 版本：v2.0 - 2025年6月21日

-- ==========================================
-- 第一步：准备工作
-- ==========================================

-- 禁用外键检查和自动提交
SET FOREIGN_KEY_CHECKS = 0;
SET AUTOCOMMIT = 0;

-- 开始事务
START TRANSACTION;

-- ==========================================
-- 第二步：删除旧表（按依赖关系顺序）
-- ==========================================

DROP TABLE IF EXISTS user_storage_assignments;
DROP TABLE IF EXISTS strategies;
DROP TABLE IF EXISTS share_codes;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS albums;
DROP TABLE IF EXISTS users;

-- ==========================================
-- 第三步：创建用户表
-- ==========================================

CREATE TABLE users (
  id varchar(36) NOT NULL PRIMARY KEY,
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password varchar(255) NOT NULL,
  avatar varchar(500) DEFAULT NULL,
  is_adminer tinyint(1) DEFAULT 0,
  image_num int(11) DEFAULT 0,
  album_num int(11) DEFAULT 0,
  capacity bigint(20) DEFAULT 10737418240 COMMENT '存储容量限制，默认10GB',
  used_storage bigint(20) DEFAULT 0 COMMENT '已使用存储空间',
  is_premium tinyint(1) DEFAULT 0 COMMENT '是否为高级用户',
  premium_expires_at datetime DEFAULT NULL COMMENT '高级用户过期时间',
  api_token varchar(64) DEFAULT NULL UNIQUE,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_api_token (api_token),
  INDEX idx_is_adminer (is_adminer),
  INDEX idx_is_premium (is_premium)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第四步：创建相册表
-- ==========================================

CREATE TABLE albums (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text DEFAULT NULL,
  user_id varchar(36) NOT NULL,
  is_public tinyint(1) DEFAULT 0,
  is_private tinyint(1) DEFAULT 0,
  is_encrypted tinyint(1) DEFAULT 0,
  password varchar(255) DEFAULT NULL,
  cover_image varchar(500) DEFAULT NULL,
  image_count int(11) DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_public (is_public),
  INDEX idx_is_private (is_private),
  INDEX idx_is_encrypted (is_encrypted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第五步：创建存储策略表
-- ==========================================

CREATE TABLE storage_strategies (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name varchar(255) NOT NULL,
  type varchar(50) NOT NULL COMMENT '存储类型: local, onedrive, github, aliyun, tencent, s3',
  config json NOT NULL COMMENT '存储配置信息',
  is_default tinyint(1) DEFAULT 0,
  status varchar(20) DEFAULT 'active',
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第六步：创建用户存储分配表
-- ==========================================

CREATE TABLE user_storage_assignments (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(36) NOT NULL,
  strategy_id int(11) NOT NULL,
  is_default tinyint(1) DEFAULT 0,
  quota decimal(10,2) DEFAULT NULL COMMENT '分配配额GB',
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_strategy (user_id, strategy_id),
  INDEX idx_user_id (user_id),
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第七步：创建图片表
-- ==========================================

CREATE TABLE images (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name varchar(255) NOT NULL,
  origin_name varchar(255) NOT NULL,
  path varchar(1000) NOT NULL,
  size bigint(20) NOT NULL,
  mimetype varchar(100) NOT NULL,
  extension varchar(10) NOT NULL,
  width int(11) DEFAULT NULL,
  height int(11) DEFAULT NULL,
  storage varchar(50) DEFAULT 'local',
  strategy_id int(11) DEFAULT NULL,
  user_id varchar(36) NOT NULL,
  album_id int(11) DEFAULT NULL,
  is_public tinyint(1) DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_album_id (album_id),
  INDEX idx_strategy_id (strategy_id),
  INDEX idx_storage (storage),
  INDEX idx_is_public (is_public),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第八步：创建分享码表
-- ==========================================

CREATE TABLE share_codes (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code varchar(32) NOT NULL UNIQUE,
  image_id int(11) NOT NULL,
  user_id varchar(36) NOT NULL,
  expires_at datetime DEFAULT NULL,
  view_count int(11) DEFAULT 0,
  is_active tinyint(1) DEFAULT 1,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_image_id (image_id),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第九步：创建通知表
-- ==========================================

CREATE TABLE notifications (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(36) NOT NULL,
  title varchar(255) NOT NULL,
  message text NOT NULL,
  type varchar(50) DEFAULT 'info',
  is_read tinyint(1) DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 第十步：插入默认数据
-- ==========================================

-- 插入默认存储策略
INSERT INTO strategies (name, type, configs, is_default, status) VALUES
('本地存储', 'local', '{"path": "/uploads", "baseUrl": ""}', 1, 'active'),
('GitHub存储', 'github', '{"token": "", "owner": "", "repo": "", "branch": "main", "path": "images"}', 0, 'inactive'),
('OneDrive国际版', 'onedrive', '{"type": "international", "clientId": "", "clientSecret": "", "redirectUri": "", "accessToken": "", "refreshToken": ""}', 0, 'inactive'),
('OneDrive世纪互联', 'onedrive', '{"type": "china", "clientId": "", "clientSecret": "", "redirectUri": "", "accessToken": "", "refreshToken": ""}', 0, 'inactive'),
('阿里云OSS', 'aliyun', '{"accessKeyId": "", "accessKeySecret": "", "bucket": "", "region": "", "endpoint": "", "domain": ""}', 0, 'inactive'),
('腾讯云COS', 'tencent', '{"secretId": "", "secretKey": "", "bucket": "", "region": "", "domain": ""}', 0, 'inactive'),
('AWS S3', 's3', '{"accessKeyId": "", "secretAccessKey": "", "bucket": "", "region": "us-east-1", "endpoint": "", "domain": ""}', 0, 'inactive');

-- 创建默认管理员账户（如果不存在）
INSERT IGNORE INTO users (id, name, email, password, is_adminer, api_token) VALUES
('admin-001', '系统管理员', 'admin@example.com', '$2b$10$rEVn.E4zE1YQQ5mJFJlzRe7YKGJOzpJ5.KQfQ2QJ.qJGQfQ2QJ.qJ', 1, 'admin_token_12345');

-- 为管理员分配默认存储
INSERT INTO user_storage_assignments (user_id, strategy_id, is_default, is_active) VALUES
('admin-001', 1, 1, 1);

-- 创建默认相册
INSERT INTO albums (name, description, user_id, is_public) VALUES
('默认相册', '系统默认创建的相册', 'admin-001', 1);

-- ==========================================
-- 第十一步：创建视图和存储过程
-- ==========================================

-- 创建用户可用存储视图
CREATE OR REPLACE VIEW user_available_storages AS
SELECT 
    usa.user_id,
    s.id as strategy_id,
    s.name as strategy_name,
    s.type as storage_type,
    s.configs,
    usa.is_default as is_user_default,
    usa.quota,
    usa.is_active,
    s.status as strategy_status
FROM user_storage_assignments usa
JOIN strategies s ON usa.strategy_id = s.id
WHERE usa.is_active = 1 AND s.status = 'active';

-- 创建图片统计视图
CREATE OR REPLACE VIEW image_stats AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    COUNT(i.id) as total_images,
    COALESCE(SUM(i.size), 0) as total_size,
    COUNT(CASE WHEN i.is_public = 1 THEN 1 END) as public_images,
    COUNT(CASE WHEN i.is_public = 0 THEN 1 END) as private_images
FROM users u
LEFT JOIN images i ON u.id = i.user_id
GROUP BY u.id, u.name;

-- ==========================================
-- 第十二步：创建触发器
-- ==========================================

DELIMITER $$

-- 用户图片数量更新触发器
CREATE TRIGGER update_user_image_count_insert
AFTER INSERT ON images
FOR EACH ROW
BEGIN
    UPDATE users SET image_num = (
        SELECT COUNT(*) FROM images WHERE user_id = NEW.user_id
    ) WHERE id = NEW.user_id;
END$$

CREATE TRIGGER update_user_image_count_delete
AFTER DELETE ON images
FOR EACH ROW
BEGIN
    UPDATE users SET image_num = (
        SELECT COUNT(*) FROM images WHERE user_id = OLD.user_id
    ) WHERE id = OLD.user_id;
END$$

-- 为新用户自动分配默认存储
CREATE TRIGGER auto_assign_default_storage
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_storage_assignments (user_id, strategy_id, is_default, is_active)
    SELECT NEW.id, id, 1, 1
    FROM strategies 
    WHERE is_default = 1 
    LIMIT 1;
END$$

DELIMITER ;

-- ==========================================
-- 第十三步：启用外键检查并提交
-- ==========================================

-- 启用外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 提交事务
COMMIT;

-- 启用自动提交
SET AUTOCOMMIT = 1;

-- ==========================================
-- 完成信息
-- ==========================================

SELECT 
    '数据库重建完成！' as message,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM strategies) as total_strategies,
    (SELECT COUNT(*) FROM user_storage_assignments) as total_assignments,
    (SELECT COUNT(*) FROM albums) as total_albums,
    NOW() as completed_at;
