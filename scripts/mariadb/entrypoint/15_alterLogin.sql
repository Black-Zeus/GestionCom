ALTER TABLE users
ADD COLUMN last_login_ip VARCHAR(45) AFTER last_login_at;
