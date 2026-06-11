ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS hour_format ENUM('24h', '12h') NULL DEFAULT '24h' AFTER timezone;

UPDATE user_preferences
SET hour_format = '24h'
WHERE hour_format IS NULL;
