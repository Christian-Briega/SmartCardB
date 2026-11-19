-- ============================================================================
-- SmartCard BUS - Esquema de Banco de Dados Relacional MySQL 8.0+
-- Substitui o armazenamento local (localStorage) por persistência em MySQL
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smartcard_bus
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartcard_bus;

-- 1. Tabela de Usuários (Passageiros, Fiscais e Administradores)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(150) NOT NULL UNIQUE,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  birth_date VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_uri LONGTEXT NULL,
  role ENUM('commuter', 'student', 'senior', 'corporate', 'operator', 'admin') NOT NULL DEFAULT 'commuter',
  kyc_status ENUM('unverified', 'pending', 'verified') NOT NULL DEFAULT 'verified',
  biometrics_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  whatsapp_alerts TINYINT(1) NOT NULL DEFAULT 0,
  google_account VARCHAR(180) NULL,
  apple_account VARCHAR(180) NULL,
  has_completed_pass_selection TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_cpf (cpf),
  INDEX idx_users_email (email),
  INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1B. Tabela espelho em Português (usuarios) para visualização direta no MySQL / phpMyAdmin
CREATE TABLE IF NOT EXISTS usuarios (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NULL UNIQUE,
  nome VARCHAR(150) NOT NULL UNIQUE,
  cpf VARCHAR(20) NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  telefone VARCHAR(30) NULL UNIQUE,
  data_nascimento VARCHAR(20) NULL,
  senha VARCHAR(255) NOT NULL,
  saldo DECIMAL(10, 2) NULL DEFAULT 42.50,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Sessões e Chaves Seguras (Substitui o localStorage)
CREATE TABLE IF NOT EXISTS user_sessions (
  session_key VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  payload LONGTEXT NOT NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Cartões de Transporte (Passes Digitais e Físicos)
CREATE TABLE IF NOT EXISTS pass_cards (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'comum',
  title VARCHAR(120) NOT NULL,
  tag VARCHAR(80) NOT NULL,
  card_number VARCHAR(32) NOT NULL DEFAULT '',
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  rides_count INT NOT NULL DEFAULT 0,
  holder VARCHAR(150) NOT NULL,
  is_blocked TINYINT(1) NOT NULL DEFAULT 0,
  color_start VARCHAR(16) NOT NULL DEFAULT '#003ec8',
  color_end VARCHAR(16) NOT NULL DEFAULT '#0d53fc',
  validity VARCHAR(32) NULL,
  remaining_quota INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pass_cards_user (user_id),
  CONSTRAINT fk_pass_cards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de Transações Financeiras (Recargas, Passagens, Transferências)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  card_id VARCHAR(64) NOT NULL,
  type ENUM('recharge', 'ride', 'transfer_in', 'transfer_out') NOT NULL,
  title VARCHAR(150) NOT NULL,
  subtitle VARCHAR(200) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tx_date VARCHAR(32) NOT NULL,
  tx_time VARCHAR(16) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'bolt',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transactions_user (user_id),
  INDEX idx_transactions_card (card_id),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_transactions_card FOREIGN KEY (card_id) REFERENCES pass_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Cartões Bancários de Pagamento (Crédito / Débito)
CREATE TABLE IF NOT EXISTS payment_cards (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  card_number_masked VARCHAR(32) NOT NULL,
  holder VARCHAR(150) NOT NULL,
  brand VARCHAR(64) NOT NULL DEFAULT 'Cartão',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_cards_user (user_id),
  CONSTRAINT fk_payment_cards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Configuração de Recarga Automática
CREATE TABLE IF NOT EXISTS auto_recharge_configs (
  user_id VARCHAR(64) PRIMARY KEY,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  threshold DECIMAL(10, 2) NULL,
  recharge_amount DECIMAL(10, 2) NULL,
  payment_method VARCHAR(80) NULL,
  notifications_whatsapp TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auto_recharge_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela do Plano Família Integrado
CREATE TABLE IF NOT EXISTS family_members (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  birth_date VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_family_members_user (user_id),
  CONSTRAINT fk_family_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela de Solicitações de Empréstimo Emergencial e Reserva de Crédito
CREATE TABLE IF NOT EXISTS credit_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  request_type ENUM('balance_loan', 'credit_reserve') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(80) NOT NULL,
  status ENUM('pending', 'approved', 'settled') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_credit_requests_user (user_id),
  CONSTRAINT fk_credit_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabela de Notificações do Passageiro
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('recharge', 'security', 'transit', 'promo') NOT NULL DEFAULT 'transit',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  icon VARCHAR(64) NOT NULL DEFAULT 'notifications',
  time_label VARCHAR(64) NOT NULL DEFAULT 'Agora mesmo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabela de Pagamentos e Ordens do Mercado Pago (Pix, Cartão, Transferências e Crédito)
CREATE TABLE IF NOT EXISTS mercado_pago_payments (
  id VARCHAR(64) PRIMARY KEY,
  mp_payment_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  card_id VARCHAR(64) NULL,
  operation_type VARCHAR(32) NOT NULL DEFAULT 'recharge',
  payment_method VARCHAR(32) NOT NULL DEFAULT 'pix',
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  pix_qr_code TEXT NULL,
  pix_qr_code_base64 LONGTEXT NULL,
  target_info VARCHAR(180) NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mp_payments_user (user_id),
  INDEX idx_mp_payments_mp_id (mp_payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabela de Códigos de Verificação OTP por E-mail (Brevo Transactional Email)
CREATE TABLE IF NOT EXISTS otp_codes (
  id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(180) NULL,
  phone_digits VARCHAR(180) NULL DEFAULT '',
  code VARCHAR(10) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  delivery_status VARCHAR(40) NOT NULL DEFAULT 'brevo_email_sent',
  used TINYINT(1) NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_otp_email (email),
  INDEX idx_otp_phone (phone_digits)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

