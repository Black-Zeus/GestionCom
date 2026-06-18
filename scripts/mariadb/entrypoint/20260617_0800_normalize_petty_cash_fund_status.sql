-- Align petty cash fund status values with the backend/frontend workflow.
-- Older dev databases were created with ACTIVE/SUSPENDED/CLOSED; the app now uses
-- UNDECLARED/DECLARED/SUSPENDED/CLOSED.

ALTER TABLE petty_cash_funds
  MODIFY COLUMN fund_status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED', 'UNDECLARED', 'DECLARED') DEFAULT 'UNDECLARED';

UPDATE petty_cash_funds
SET fund_status = 'UNDECLARED'
WHERE fund_status = 'ACTIVE';

ALTER TABLE petty_cash_funds
  MODIFY COLUMN fund_status ENUM('UNDECLARED', 'DECLARED', 'SUSPENDED', 'CLOSED') DEFAULT 'UNDECLARED';
