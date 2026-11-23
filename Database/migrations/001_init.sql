-- SaveSmart AI - Skema Database MySQL (Laragon)
-- dicopy terus di jalankan di laragon
CREATE DATABASE IF NOT EXISTS savesmart_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE savesmart_ai;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30)  NOT NULL DEFAULT '',
  language      VARCHAR(10)  NOT NULL DEFAULT 'id',
  currency      VARCHAR(10)  NOT NULL DEFAULT 'IDR',
  budget_period VARCHAR(20)  NOT NULL DEFAULT 'monthly',
  notif_budget  TINYINT(1)   NOT NULL DEFAULT 1,
  notif_goal    TINYINT(1)   NOT NULL DEFAULT 1,
  notif_weekly  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  title      VARCHAR(150) NOT NULL,
  category   VARCHAR(50)  NOT NULL,
  amount     BIGINT       NOT NULL,
  type       ENUM('expense','income') NOT NULL,
  date       VARCHAR(10)  NOT NULL,
  source     ENUM('manual','scan') NOT NULL DEFAULT 'manual',
  note       VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tx_user_date (user_id, date DESC, id DESC),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS budgets (
  user_id      INT         NOT NULL,
  category     VARCHAR(50) NOT NULL,
  limit_amount BIGINT      NOT NULL,
  alert_at     INT         NOT NULL DEFAULT 90,
  PRIMARY KEY (user_id, category),
  CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS goals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  name          VARCHAR(100) NOT NULL,
  target_amount BIGINT       NOT NULL,
  deadline      VARCHAR(10)  NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  months        INT          NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_goals_user (user_id),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS deposits (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  goal_id    INT          NOT NULL,
  amount     BIGINT       NOT NULL,
  date       VARCHAR(10)  NOT NULL,
  note       VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deposits_goal (goal_id, date DESC, id DESC),
  CONSTRAINT fk_deposits_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  kind       ENUM('budget','receipt','goal') NOT NULL,
  title      VARCHAR(150) NOT NULL,
  body       TEXT         NOT NULL,
  link       VARCHAR(150) NOT NULL,
  dedupe_key VARCHAR(150) NULL,
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_dedupe (user_id, dedupe_key),
  INDEX idx_notif_user (user_id, id DESC),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;