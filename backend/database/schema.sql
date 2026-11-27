-- ============================================================================
-- SmartCard BUS - Esquema de Banco de Dados Relacional MySQL 8.0+ / MariaDB 10.4+
-- Otimizado: integridade referencial, tipos nativos, sem índices redundantes
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `smartcard_bus`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smartcard_bus`;

-- 1. Tabela de Usuários (Passageiros, Fiscais e Administradores)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `cpf` VARCHAR(14) NOT NULL,
  `email` VARCHAR(180) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `birth_date` DATE NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar_uri` MEDIUMTEXT NULL,
  `role` ENUM('commuter', 'student', 'senior', 'corporate', 'operator', 'admin') NOT NULL DEFAULT 'commuter',
  `kyc_status` ENUM('unverified', 'pending', 'verified') NOT NULL DEFAULT 'verified',
  `biometrics_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `two_factor_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `whatsapp_alerts` TINYINT(1) NOT NULL DEFAULT 0,
  `google_account` VARCHAR(180) NULL,
  `apple_account` VARCHAR(180) NULL,
  `has_completed_pass_selection` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('ativo', 'inativo', 'bloqueado', 'pendente') NOT NULL DEFAULT 'ativo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_users_cpf` (`cpf`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  KEY `idx_users_name` (`name`),
  KEY `idx_users_status` (`status`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Sessões e Chaves Seguras (Substitui o localStorage)
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_key` VARCHAR(128) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NULL,
  `payload` MEDIUMTEXT NOT NULL,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_sessions_user` (`user_id`),
  KEY `idx_sessions_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Cartões de Transporte (Passes Digitais e Físicos)
CREATE TABLE IF NOT EXISTS `pass_cards` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'comum',
  `title` VARCHAR(120) NOT NULL,
  `tag` VARCHAR(80) NOT NULL,
  `card_number` VARCHAR(32) NULL DEFAULT NULL,
  `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `rides_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `holder` VARCHAR(150) NOT NULL,
  `is_blocked` TINYINT(1) NOT NULL DEFAULT 0,
  `color_start` VARCHAR(16) NOT NULL DEFAULT '#003ec8',
  `color_end` VARCHAR(16) NOT NULL DEFAULT '#0d53fc',
  `validity` DATE NULL,
  `remaining_quota` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_pass_cards_user_number` (`user_id`, `card_number`),
  KEY `idx_pass_cards_user` (`user_id`),
  CONSTRAINT `fk_pass_cards_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_pass_cards_balance` CHECK (`balance` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1B. View espelho em Português (usuarios) sempre sincronizada com users e pass_cards
DROP TABLE IF EXISTS `usuarios`;
CREATE OR REPLACE VIEW `usuarios` AS
SELECT
  ROW_NUMBER() OVER (ORDER BY `u`.`created_at` ASC) AS `id`,
  `u`.`id` AS `user_id`,
  `u`.`name` AS `nome`,
  `u`.`cpf`,
  `u`.`email`,
  `u`.`phone` AS `telefone`,
  `u`.`birth_date` AS `data_nascimento`,
  `u`.`password_hash` AS `senha`,
  COALESCE((SELECT SUM(`c`.`balance`) FROM `pass_cards` `c` WHERE `c`.`user_id` = `u`.`id`), 0.00) AS `saldo`,
  `u`.`is_active` AS `ativo`,
  `u`.`status`,
  `u`.`created_at` AS `criado_em`
FROM `users` `u`;

-- 4. Tabela de Transações Financeiras (Recargas, Passagens, Transferências)
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `card_id` VARCHAR(64) NOT NULL,
  `type` ENUM('recharge', 'ride', 'transfer_in', 'transfer_out') NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `subtitle` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `tx_date` VARCHAR(32) NOT NULL,
  `tx_time` VARCHAR(16) NOT NULL,
  `icon` VARCHAR(64) NOT NULL DEFAULT 'bolt',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_transactions_user_created` (`user_id`, `created_at`),
  KEY `idx_transactions_card_created` (`card_id`, `created_at`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transactions_card` FOREIGN KEY (`card_id`) REFERENCES `pass_cards`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela de Cartões Bancários de Pagamento (Crédito / Débito)
CREATE TABLE IF NOT EXISTS `payment_cards` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `card_number_masked` VARCHAR(32) NOT NULL,
  `holder` VARCHAR(150) NOT NULL,
  `brand` VARCHAR(64) NOT NULL DEFAULT 'Cartão',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_payment_cards_user` (`user_id`),
  CONSTRAINT `fk_payment_cards_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela de Configuração de Recarga Automática
CREATE TABLE IF NOT EXISTS `auto_recharge_configs` (
  `user_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `threshold` DECIMAL(10, 2) NULL,
  `recharge_amount` DECIMAL(10, 2) NULL,
  `payment_method` VARCHAR(80) NULL,
  `notifications_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_auto_recharge_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_auto_recharge_values` CHECK (
    (`threshold` IS NULL OR `threshold` >= 0) AND
    (`recharge_amount` IS NULL OR `recharge_amount` > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela do Plano Família Integrado
CREATE TABLE IF NOT EXISTS `family_members` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(180) NOT NULL,
  `birth_date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_family_members_user_email` (`user_id`, `email`),
  CONSTRAINT `fk_family_members_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela de Solicitações de Empréstimo Emergencial e Reserva de Crédito
CREATE TABLE IF NOT EXISTS `credit_requests` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `request_type` ENUM('balance_loan', 'credit_reserve') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` VARCHAR(80) NOT NULL,
  `status` ENUM('pending', 'approved', 'settled', 'rejected') NOT NULL DEFAULT 'pending',
  `requested_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_credit_requests_user_status` (`user_id`, `status`, `created_at`),
  CONSTRAINT `fk_credit_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_credit_requests_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Tabela de Notificações do Passageiro
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('recharge', 'security', 'transit', 'promo') NOT NULL DEFAULT 'transit',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `icon` VARCHAR(64) NOT NULL DEFAULT 'notifications',
  `time_label` VARCHAR(64) NOT NULL DEFAULT 'Agora mesmo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_notifications_user_read_created` (`user_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Tabela de Pagamentos e Ordens do Mercado Pago (Pix, Cartão, Transferências e Crédito)
CREATE TABLE IF NOT EXISTS `mercado_pago_payments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `mp_payment_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `card_id` VARCHAR(64) NULL,
  `operation_type` VARCHAR(32) NOT NULL DEFAULT 'recharge',
  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'pix',
  `amount` DECIMAL(10, 2) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `pix_qr_code` TEXT NULL,
  `pix_qr_code_base64` MEDIUMTEXT NULL,
  `target_info` VARCHAR(180) NULL,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_mp_payments_mp_id` (`mp_payment_id`),
  KEY `idx_mp_payments_user_status` (`user_id`, `status`, `created_at`),
  KEY `idx_mp_payments_card` (`card_id`),
  KEY `idx_mp_payments_status_expires` (`status`, `expires_at`),
  CONSTRAINT `fk_mp_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mp_payments_card` FOREIGN KEY (`card_id`) REFERENCES `pass_cards`(`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_mp_payments_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Tabela de Códigos de Verificação OTP (E-mail, SMS, WhatsApp)
CREATE TABLE IF NOT EXISTS `otp_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(180) NULL,
  `phone_digits` VARCHAR(20) NULL,
  `code` VARCHAR(10) NOT NULL,
  `channel` ENUM('email', 'sms', 'whatsapp') NOT NULL DEFAULT 'email',
  `delivery_status` VARCHAR(40) NOT NULL DEFAULT 'dispatched',
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_otp_phone_lookup` (`phone_digits`, `used`, `expires_at`),
  KEY `idx_otp_email_lookup` (`email`, `used`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
