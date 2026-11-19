import {
  AutoRechargeConfig,
  CardType,
  FamilyMember,
  PassCard,
  PaymentCard,
  PendingCreditRequest,
  Transaction,
  TransitNotification,
  User,
} from '../types';

export const MYSQL_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface MysqlUserFullState {
  user: User & { id?: string; hasCompletedPassSelection?: boolean };
  hasCompletedPassSelection: boolean;
  cards: PassCard[];
  transactions: Transaction[];
  paymentCards: PaymentCard[];
  autoRecharge: AutoRechargeConfig;
  familyMembers: FamilyMember[];
  balanceLoanRequest: PendingCreditRequest | null;
  creditReserveRequest: PendingCreditRequest | null;
  notifications: TransitNotification[];
}

function getCandidateBaseUrls(): string[] {
  const candidates = new Set<string>();
  if (process.env.EXPO_PUBLIC_API_URL) {
    candidates.add(process.env.EXPO_PUBLIC_API_URL);
  }
  candidates.add('http://localhost:3001/api');
  candidates.add('http://127.0.0.1:3001/api');
  if (typeof window !== 'undefined' && window.location?.hostname) {
    candidates.add(`http://${window.location.hostname}:3001/api`);
    if (window.location.origin) {
      candidates.add(`${window.location.origin}/api`);
    }
  }
  return Array.from(candidates);
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T | null> {
  if (typeof fetch === 'undefined') return null;

  const baseUrls = getCandidateBaseUrls();
  for (const baseUrl of baseUrls) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Protocol': 'Anti-Gravidade-v1',
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as T;
    } catch {
      // Tenta o próximo host candidato caso haja falha de rede local
    }
  }

  return null;
}

export const mysqlApiService = {
  /**
   * Verifica status do servidor Backend e conexão ativa com o MySQL
   */
  async checkHealth(): Promise<{ status: string; database: string } | null> {
    return apiRequest<{ status: string; database: string }>('/health', {
      method: 'GET',
    });
  },

  /**
   * Recupera a sessão ativa e o estado completo salvo no MySQL ao iniciar/recarregar o app
   */
  async getCurrentSession(): Promise<{
    ok: boolean;
    isLoggedIn: boolean;
    state: MysqlUserFullState | null;
  } | null> {
    return apiRequest('/session/current', { method: 'GET' });
  },

  async logoutSession(): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' });
    return Boolean(res?.ok);
  },

  async enterDemoMode(payload: {
    userId?: string;
    name?: string;
    card: PassCard;
  }): Promise<{ ok: boolean; state?: MysqlUserFullState } | null> {
    return apiRequest('/auth/demo', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Persistência de chaves e sessões diretamente na tabela user_sessions do MySQL
   * (Substitui o antigo window.localStorage)
   */
  async setStorageItem(key: string, value: string, userId?: string): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/storage/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value, userId }),
      }
    );
    return Boolean(res?.ok);
  },

  async getStorageItem(key: string): Promise<string | null> {
    const res = await apiRequest<{ key: string; value: string | null }>(
      `/storage/${encodeURIComponent(key)}`,
      { method: 'GET' }
    );
    return res?.value ?? null;
  },

  async deleteStorageItem(key: string): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/storage/${encodeURIComponent(key)}`,
      { method: 'DELETE' }
    );
    return Boolean(res?.ok);
  },

  /**
   * Autenticação e Cadastro de Usuários no MySQL
   */
  async registerUser(payload: {
    id?: string;
    name: string;
    cpf: string;
    email: string;
    phone: string;
    birthDate?: string;
    password: string;
    whatsappAlerts: boolean;
  }): Promise<{
    ok: boolean;
    field?: string;
    error?: string;
    user?: User & { id: string };
    state?: MysqlUserFullState;
  } | null> {
    if (typeof fetch === 'undefined') return null;
    const baseUrls = getCandidateBaseUrls();
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Security-Protocol': 'Anti-Gravidade-v1',
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok) {
          return data;
        }
        if (response.status === 409 || response.status === 400) {
          return {
            ok: false,
            field: data?.field,
            error:
              data?.error ||
              'Já existe uma conta cadastrada com estes dados pessoais (CPF, e-mail, celular ou nome).',
          };
        }
      } catch {
        // Tenta próximo host candidato
      }
    }
    return null;
  },

  async loginUser(
    identifier: string,
    password?: string
  ): Promise<{ ok: boolean; inactive?: boolean; error?: string; state?: MysqlUserFullState } | null> {
    if (typeof fetch === 'undefined') return null;
    const baseUrls = getCandidateBaseUrls();
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Security-Protocol': 'Anti-Gravidade-v1',
          },
          body: JSON.stringify({ identifier, password }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok) {
          return data;
        }
        if (response.status === 403 && data?.inactive) {
          return {
            ok: false,
            inactive: true,
            error:
              data?.error ||
              'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
          };
        }
        if (response.status === 401 || response.status === 400 || response.status === 404) {
          return {
            ok: false,
            error: data?.error || 'Credenciais inválidas',
          };
        }
      } catch {
        // Tenta o próximo host candidato
      }
    }
    return null;
  },

  async getBrevoEmailStatus(): Promise<{
    ok: boolean;
    configured: boolean;
    senderEmail?: string | null;
  } | null> {
    return apiRequest('/email/status', { method: 'GET' });
  },

  async saveBrevoEmailConfig(payload: {
    brevoApiKey: string;
    senderEmail?: string;
  }): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/email/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Boolean(res?.ok);
  },

  async sendOtpCode(payload: {
    email?: string;
    identifier?: string;
    phone?: string;
    channel?: 'email' | 'sms' | 'whatsapp';
    mode?: 'login' | 'verify' | 'reset_password';
    brevoApiKey?: string;
    senderEmail?: string;
    forceNew?: boolean;
  }): Promise<{
    ok: boolean;
    email?: string;
    channel?: string;
    providerStatus?: string;
    senderEmail?: string | null;
    needsBrevoKey?: boolean;
    inactive?: boolean;
    error?: string;
  }> {
    if (typeof fetch !== 'undefined') {
      const baseUrls = getCandidateBaseUrls();
      for (const baseUrl of baseUrls) {
        try {
          const response = await fetch(`${baseUrl}/auth/send-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Security-Protocol': 'Anti-Gravidade-v1',
            },
            body: JSON.stringify(payload),
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data?.ok) {
            return data;
          }
          if (response.ok && (data?.needsBrevoKey || data?.ok === false)) {
            return {
              ok: false,
              needsBrevoKey: Boolean(data.needsBrevoKey),
              error: data.error,
            };
          }
          if (response.status === 403 && data?.inactive) {
            return {
              ok: false,
              inactive: true,
              error:
                data?.error ||
                'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
            };
          }
          if (response.status === 400 || response.status === 404) {
            return {
              ok: false,
              error: data?.error || 'Não foi possível enviar o código para este e-mail.',
            };
          }
        } catch {
          // Tenta próximo host
        }
      }
    }

    return {
      ok: false,
      error: 'Não foi possível conectar ao servidor para enviar o e-mail via Brevo.',
    };
  },

  async verifyOtpCode(payload: {
    email?: string;
    identifier?: string;
    phone?: string;
    code: string;
    mode?: 'login' | 'verify' | 'reset_password';
  }): Promise<{
    ok: boolean;
    verified?: boolean;
    state?: MysqlUserFullState;
    inactive?: boolean;
    error?: string;
  }> {
    if (typeof fetch !== 'undefined') {
      const baseUrls = getCandidateBaseUrls();
      for (const baseUrl of baseUrls) {
        try {
          const response = await fetch(`${baseUrl}/auth/verify-otp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Security-Protocol': 'Anti-Gravidade-v1',
            },
            body: JSON.stringify(payload),
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data?.ok) {
            return data;
          }
          if (response.status === 403 && data?.inactive) {
            return {
              ok: false,
              inactive: true,
              error:
                data?.error ||
                'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
            };
          }
          if (response.status === 400 || response.status === 401 || response.status === 404) {
            return {
              ok: false,
              error:
                data?.error ||
                'Código incorreto ou expirado. Confira os 6 dígitos enviados para o seu e-mail.',
            };
          }
        } catch {
          // Tenta próximo host
        }
      }
    }
    return { ok: false, error: 'Não foi possível validar o código no servidor.' };
  },

  async loginWithPhone(
    phone: string
  ): Promise<{ ok: boolean; state?: MysqlUserFullState } | null> {
    return apiRequest('/auth/login-phone', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async authenticateSocial(payload: {
    provider: 'google' | 'apple';
    name: string;
    email: string;
    mode: 'login' | 'register' | 'link';
  }): Promise<{ ok: boolean; state?: MysqlUserFullState } | null> {
    return apiRequest('/auth/social', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(identifier: string, newPassword: string): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, newPassword }),
    });
    return Boolean(res?.ok);
  },

  async getUserState(userId: string): Promise<MysqlUserFullState | null> {
    const res = await apiRequest<{ ok: boolean; state: MysqlUserFullState }>(
      `/users/${encodeURIComponent(userId)}/state`,
      { method: 'GET' }
    );
    return res?.state ?? null;
  },

  async updateUser(
    userId: string,
    updates: Partial<User> & { hasCompletedPassSelection?: boolean }
  ): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/users/${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return Boolean(res?.ok);
  },

  async deleteUserAccount(payload: {
    userId?: string;
    cpf?: string;
    email?: string;
    password: string;
  }): Promise<{ ok: boolean; error?: string }> {
    if (typeof fetch === 'undefined') {
      return { ok: false, error: 'Ambiente sem suporte de rede' };
    }
    const baseUrls = getCandidateBaseUrls();
    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/users/inactivate-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Security-Protocol': 'Anti-Gravidade-v1',
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data?.ok) {
          return { ok: true };
        }
        if (response.status === 400 || response.status === 401 || response.status === 404) {
          return {
            ok: false,
            error: data?.error || 'Senha incorreta. Confira a senha da sua conta.',
          };
        }
      } catch {
        // Tenta o próximo host candidato
      }
    }
    return { ok: false, error: 'Não foi possível conectar ao servidor MySQL para inativar a conta.' };
  },

  /**
   * Operações de Cartões de Transporte e Transações no MySQL
   */
  async createPassCard(payload: {
    id: string;
    userId: string;
    type: CardType;
    title: string;
    tag: string;
    number: string;
    balance: number;
    ridesCount: number;
    holder: string;
    isBlocked: boolean;
    colors: [string, string, ...string[]];
    validity?: string;
    remainingQuota?: number;
    markPassSelectionComplete?: boolean;
  }): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/cards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Boolean(res?.ok);
  },

  async toggleCardBlock(cardId: string): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/cards/${encodeURIComponent(cardId)}/block`,
      { method: 'PATCH' }
    );
    return Boolean(res?.ok);
  },

  async rechargeCard(
    cardId: string,
    payload: {
      userId: string;
      txId: string;
      amount: number;
      paymentMethod: string;
      title?: string;
      date?: string;
      time?: string;
      icon?: string;
    }
  ): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/cards/${encodeURIComponent(cardId)}/recharge`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return Boolean(res?.ok);
  },

  async transferBalance(payload: {
    userId: string;
    txId: string;
    sourceId: string;
    targetInfo: string;
    amount: number;
    isExternal: boolean;
    paidViaMercadoPago?: boolean;
    paymentMethod?: string;
  }): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/cards/transfer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Boolean(res?.ok);
  },

  async renewStudentProof(
    cardId: string,
    userId: string,
    fileName: string
  ): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/cards/${encodeURIComponent(cardId)}/student-proof`,
      {
        method: 'POST',
        body: JSON.stringify({ userId, fileName }),
      }
    );
    return Boolean(res?.ok);
  },

  async addPaymentCard(
    userId: string,
    card: PaymentCard
  ): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/payment-cards', {
      method: 'POST',
      body: JSON.stringify({ ...card, userId }),
    });
    return Boolean(res?.ok);
  },

  async updateAutoRecharge(
    userId: string,
    config: AutoRechargeConfig
  ): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/users/${encodeURIComponent(userId)}/auto-recharge`,
      {
        method: 'PUT',
        body: JSON.stringify(config),
      }
    );
    return Boolean(res?.ok);
  },

  async addFamilyMember(
    userId: string,
    member: FamilyMember
  ): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/family-members', {
      method: 'POST',
      body: JSON.stringify({ ...member, userId }),
    });
    return Boolean(res?.ok);
  },

  async createCreditRequest(payload: {
    userId: string;
    requestType: 'balance_loan' | 'credit_reserve';
    amount: number;
    paymentMethod: string;
    status?: string;
  }): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/credit-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Boolean(res?.ok);
  },

  async settleCreditRequest(payload: {
    userId: string;
    requestType: 'balance_loan' | 'credit_reserve';
    paymentMethod: string;
  }): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>('/credit-requests/settle', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return Boolean(res?.ok);
  },

  async markNotificationAsRead(id: string): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' }
    );
    return Boolean(res?.ok);
  },

  /**
   * Gateway Oficial Mercado Pago via Backend MySQL
   */
  async createMercadoPagoPix(payload: {
    orderId?: string;
    paymentId?: string;
    cardId?: string;
    userId: string;
    amount: number;
    description: string;
    operationType?: 'recharge' | 'transfer' | 'balance_loan' | 'credit_reserve' | 'auto_recharge';
    targetInfo?: string;
    pixCopiaECola?: string;
    qrCodeBase64?: string;
    accessToken?: string;
    payer: {
      email: string;
      firstName: string;
      cpf: string;
    };
  }): Promise<{
    ok: boolean;
    orderId: string;
    paymentId: string;
    status: 'pending' | 'approved' | 'rejected';
    amount: number;
    pixCopiaECola: string;
    qrCodeBase64: string;
    expiresAt: string;
  } | null> {
    return apiRequest('/mercadopago/pix', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async processMercadoPagoCardPayment(payload: {
    userId: string;
    cardId?: string;
    amount: number;
    operationType: 'recharge' | 'transfer' | 'balance_loan' | 'credit_reserve' | 'auto_recharge';
    paymentMethod: string;
    description: string;
    targetInfo?: string;
  }): Promise<{
    ok: boolean;
    orderId: string;
    paymentId: string;
    authorizationCode: string;
    status: 'approved';
    amount: number;
  } | null> {
    return apiRequest('/mercadopago/card-payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async approveMercadoPagoOrder(orderId: string): Promise<boolean> {
    const res = await apiRequest<{ ok: boolean }>(
      `/mercadopago/approve/${encodeURIComponent(orderId)}`,
      { method: 'POST' }
    );
    return Boolean(res?.ok);
  },

  async checkMercadoPagoStatus(
    paymentId: string
  ): Promise<{ ok: boolean; status: 'pending' | 'approved' | 'rejected' } | null> {
    return apiRequest(`/mercadopago/status/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
    });
  },
};

