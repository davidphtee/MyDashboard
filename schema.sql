-- MyDashboard — config table
-- Run once against the database specified in .env (DATABASE_NAME=incww_dashboard)

DROP TABLE IF EXISTS `config`;
CREATE TABLE IF NOT EXISTS `config` (
  `keyid`       varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  `value`       text CHARACTER SET utf8mb4 NOT NULL,
  `updated_at`  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `keyid` (`keyid`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;

--
-- Initial Settings
--

INSERT INTO `config` (`keyid`, `value`, `updated_at`) VALUES
('weather_My_Location', '0', '2026-02-20 04:50:48'),
('weather_London', '1', '2026-02-20 04:50:48'),
('weather_Brugge', '2', '2026-02-20 04:50:48'),
('weather_Izmir', '3', '2026-02-20 07:32:11'),
('crypto_BTC', '0', '2026-02-20 04:51:01'),
('crypto_ETH', '1', '2026-02-20 04:51:01'),
('crypto_SOL', '2', '2026-02-20 04:51:01'),
('markets_Nifty50', '0', '2026-02-20 04:52:52'),
('markets_Sensex', '1', '2026-02-20 04:52:52'),
('markets_FTSE100', '2', '2026-02-20 04:52:52'),
('forex_EUR', '0', '2026-02-20 04:56:17'),
('forex_USD', '1', '2026-02-20 04:56:17'),
('forex_INR', '2', '2026-02-20 04:56:17'),
('forex_CHF', '3', '2026-02-20 04:56:17'),
('forex_JPY', '4', '2026-02-20 04:56:17'),
('clock_Local', '0', '2026-02-20 04:56:20'),
('clock_London', '1', '2026-02-20 04:56:20'),
('clock_Paris', '2', '2026-02-20 04:56:20'),
('clock_Asia_Istanbul', '3', '2026-02-20 07:31:58'),
('clock_items', '[{\"label\":\"Local\",\"tz\":\"Asia/Calcutta\",\"configKey\":\"clock_Local\"},{\"label\":\"London\",\"tz\":\"Europe/London\",\"configKey\":\"clock_London\"},{\"label\":\"Paris\",\"tz\":\"Europe/Paris\",\"configKey\":\"clock_Paris\"},{\"label\":\"Istanbul\",\"tz\":\"Asia/Istanbul\",\"configKey\":\"clock_Asia_Istanbul\"}]', '2026-02-20 07:31:35'),
('crypto_items', '[{\"id\":\"bitcoin\",\"symbol\":\"BTC\",\"name\":\"Bitcoin\",\"configKey\":\"crypto_BTC\"},{\"id\":\"ethereum\",\"symbol\":\"ETH\",\"name\":\"Ethereum\",\"configKey\":\"crypto_ETH\"},{\"id\":\"solana\",\"symbol\":\"SOL\",\"name\":\"Solana\",\"configKey\":\"crypto_SOL\"}]', '2026-02-20 07:31:35'),
('markets_items', '[{\"symbol\":\"^FTSE\",\"name\":\"FTSE 100\",\"currency\":\"£\",\"configKey\":\"markets_FTSE100\"},{\"symbol\":\"^NSEI\",\"name\":\"Nifty 50\",\"currency\":\"₹\",\"configKey\":\"markets_Nifty50\"},{\"symbol\":\"^BSESN\",\"name\":\"BSE Sensex\",\"currency\":\"₹\",\"configKey\":\"markets_Sensex\"}]', '2026-02-20 07:31:35'),
('forex_items', '[{\"code\":\"USD\",\"name\":\"US Dollar\",\"configKey\":\"forex_USD\"},{\"code\":\"EUR\",\"name\":\"Euro\",\"configKey\":\"forex_EUR\"},{\"code\":\"JPY\",\"name\":\"Japanese Yen\",\"configKey\":\"forex_JPY\"},{\"code\":\"INR\",\"name\":\"Indian Rupee\",\"configKey\":\"forex_INR\"},{\"code\":\"CHF\",\"name\":\"Swiss Franc\",\"configKey\":\"forex_CHF\"}]', '2026-02-20 07:31:35'),
('weather_items', '[{\"name\":\"London\",\"lat\":51.5074,\"lon\":-0.1278,\"configKey\":\"weather_London\"},{\"name\":\"Brugge\",\"lat\":51.2093,\"lon\":3.2247,\"configKey\":\"weather_Brugge\"},{\"name\":\"Izmir\",\"lat\":38.41273,\"lon\":27.13838,\"configKey\":\"weather_Izmir\"}]', '2026-02-20 07:31:35');
