-- ==============================================================
-- 🚀 SMARTCARD BUS - SCHEMA DE BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- Pronto para rodar no SQL Editor do Supabase ou PostgreSQL no Vercel
-- ==============================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE, -- Vinculado a auth.users se usar Supabase Auth
    full_name VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    avatar_url TEXT,
    biometrics_enabled BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_alerts BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE PASSES / CARTÕES DE TRANSPORTE
CREATE TABLE IF NOT EXISTS public.transit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_type VARCHAR(30) NOT NULL CHECK (card_type IN ('comum', 'estudante', 'vt', 'idoso', 'social')),
    title VARCHAR(80) NOT NULL,
    tag VARCHAR(30) NOT NULL,
    card_number VARCHAR(20) NOT NULL UNIQUE,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    rides_count INTEGER NOT NULL DEFAULT 0,
    remaining_quota INTEGER DEFAULT 0,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    color_primary VARCHAR(10) NOT NULL DEFAULT '#003ec8',
    color_secondary VARCHAR(10) NOT NULL DEFAULT '#0d53fc',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE TRANSAÇÕES E VIAGENS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.transit_cards(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('recharge', 'ride', 'transfer_in', 'transfer_out', 'loan')),
    title VARCHAR(100) NOT NULL,
    subtitle VARCHAR(150),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE PEDIDOS E INTEGRAÇÃO COM MERCADO PAGO
CREATE TABLE IF NOT EXISTS public.mercado_pago_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.transit_cards(id) ON DELETE CASCADE,
    mp_payment_id VARCHAR(100),
    mp_preference_id VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'account_money')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_process', 'cancelled')),
    pix_qr_code TEXT,
    pix_qr_code_base64 TEXT,
    ticket_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ÍNDICES DE PERFORMANCE (ANTI-GRAVIDADE)
CREATE INDEX IF NOT EXISTS idx_transit_cards_profile ON public.transit_cards(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile ON public.transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_mp_orders_profile ON public.mercado_pago_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_mp_orders_payment_id ON public.mercado_pago_orders(mp_payment_id);

-- 7. REGRAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mercado_pago_orders ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: O passageiro só acessa seus próprios dados
CREATE POLICY "Passageiro gerencia seu perfil"
    ON public.profiles FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Passageiro visualiza seus cartões"
    ON public.transit_cards FOR ALL
    USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Passageiro visualiza suas transações"
    ON public.transactions FOR ALL
    USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Passageiro visualiza seus pedidos Mercado Pago"
    ON public.mercado_pago_orders FOR ALL
    USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

