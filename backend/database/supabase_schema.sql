-- ============================================================================
-- SmartCard BUS - Schema Oficial para Supabase (PostgreSQL 15+)
-- Cole este script no SQL Editor do painel do Supabase (https://supabase.com)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabela de Usuários (users)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || encode(gen_random_bytes(8), 'hex')),
  name TEXT NOT NULL,
  cpf VARCHAR(18) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(24) NOT NULL,
  birth_date VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  avatar_uri TEXT,
  role VARCHAR(32) NOT NULL DEFAULT 'commuter',
  kyc_status VARCHAR(32) NOT NULL DEFAULT 'verified',
  biometrics_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  google_account VARCHAR(160),
  apple_account VARCHAR(160),
  has_completed_pass_selection BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela Espelho em Português (usuarios)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id BIGSERIAL PRIMARY KEY,
  user_uid TEXT UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf VARCHAR(18) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  telefone VARCHAR(24) NOT NULL,
  data_nascimento VARCHAR(20),
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Cartões de Transporte (pass_cards)
CREATE TABLE IF NOT EXISTS public.pass_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL DEFAULT 'comum',
  title VARCHAR(120) NOT NULL,
  tag VARCHAR(80) NOT NULL,
  card_number VARCHAR(32) NOT NULL DEFAULT '',
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  rides_count INTEGER NOT NULL DEFAULT 0,
  holder VARCHAR(120) NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  color_start VARCHAR(16) NOT NULL DEFAULT '#003ec8',
  color_end VARCHAR(16) NOT NULL DEFAULT '#0d53fc',
  validity VARCHAR(32),
  remaining_quota INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Cartões Bancários de Pagamento (payment_cards)
CREATE TABLE IF NOT EXISTS public.payment_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(24) NOT NULL DEFAULT 'credit',
  brand VARCHAR(40) NOT NULL,
  last4 VARCHAR(8) NOT NULL,
  holder VARCHAR(120) NOT NULL,
  expiry VARCHAR(12) NOT NULL,
  color_start VARCHAR(16) NOT NULL DEFAULT '#1E293B',
  color_end VARCHAR(16) NOT NULL DEFAULT '#0F172A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Histórico de Transações (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_id TEXT,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(160) NOT NULL,
  subtitle VARCHAR(200) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  tx_date VARCHAR(32) NOT NULL,
  tx_time VARCHAR(16) NOT NULL,
  icon VARCHAR(48) NOT NULL DEFAULT 'bolt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Configuração de Recarga Automática (auto_recharge_configs)
CREATE TABLE IF NOT EXISTS public.auto_recharge_configs (
  user_id TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  threshold NUMERIC(10, 2),
  recharge_amount NUMERIC(10, 2),
  payment_method VARCHAR(80),
  notifications_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Dependentes do Plano Família (family_members)
CREATE TABLE IF NOT EXISTS public.family_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  relation VARCHAR(60) NOT NULL,
  pass_number VARCHAR(32) NOT NULL,
  monthly_limit NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
  auto_share BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Pagamentos Mercado Pago (mercado_pago_payments)
CREATE TABLE IF NOT EXISTS public.mercado_pago_payments (
  id TEXT PRIMARY KEY,
  mp_payment_id VARCHAR(80) NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_id TEXT,
  operation_type VARCHAR(32) NOT NULL DEFAULT 'recharge',
  payment_method VARCHAR(32) NOT NULL DEFAULT 'pix',
  amount NUMERIC(10, 2) NOT NULL,
  description VARCHAR(200),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  target_info VARCHAR(160),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance em produção
CREATE INDEX IF NOT EXISTS idx_pass_cards_user ON public.pass_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_user ON public.mercado_pago_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_mp_id ON public.mercado_pago_payments(mp_payment_id);

-- Habilita Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_pago_payments ENABLE ROW LEVEL SECURITY;

