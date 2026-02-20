-- MyDashboard — config table
-- Run once against the database specified in .env (DATABASE_NAME=incww_dashboard)

CREATE TABLE IF NOT EXISTS `config` (
    `keyid`      VARCHAR(100)  NOT NULL                           COMMENT 'Unique config key',
    `value`      TEXT          NOT NULL                           COMMENT 'Value — plain string or JSON',
    `updated_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP        COMMENT 'Last modified',
    PRIMARY KEY (`keyid`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
