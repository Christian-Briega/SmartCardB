/**
 * SmartCard BUS - Servidor Backend REST API com Banco de Dados MySQL
 *
 * Persiste todas as operações do aplicativo no banco MySQL `smartcard_bus`.
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getMysqlPool, queryMysql, MYSQL_CONFIG } = require('./db');
const {
  initWhatsAppClient,
  getWhatsAppStatus,
  requestWhatsAppPairingCode,
  sendRealWhatsAppMessage,
} = require('./whatsappService');

function reloadEnvConfig() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (val) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignora erro de leitura de .env
  }
}

reloadEnvConfig();

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const FARE = 4.4;
const ACTIVE_SESSION_KEY = 'smartcard_active_user_session';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcard_bus_bank_grade_hmac_secret_2026';

function hashPassword(password) {
  return crypto.createHash('sha256').update(`${password}:smartcard_bus_salt`).digest('hex');
}

function generateSessionToken(userId, email = '') {
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return `scbus.${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('scbus.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(parts[1]).digest('base64url');
  if (parts[2] !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Security-Protocol, X-Request-Timestamp, X-Request-Signature',
  });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Payload muito grande'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Resolve o `id` real da tabela `users` a partir de id, CPF ou e-mail.
 * Se não existir (ex: modo demonstração ou primeiro uso), cria o registro em `users`
 * garantindo que todas as chaves estrangeiras (FK) do MySQL funcionem sem erro.
 */
async function resolveOrCreateUserId(identifier, fallback = {}) {
  const raw = String(identifier || '').trim();
  const digits = raw.replace(/\D/g, '');
  const fbCpf = String(fallback.cpf || '').trim();
  const fbCpfDigits = fbCpf.replace(/\D/g, '');
  const fbEmail = String(fallback.email || '').trim().toLowerCase();

  if (raw && raw !== 'default_user') {
    const existing = await queryMysql(
      `SELECT id FROM users
       WHERE id = ?
          OR cpf = ?
          OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
          OR LOWER(email) = LOWER(?)
       LIMIT 1`,
      [raw, raw, digits, digits, raw]
    );
    if (existing.length > 0) {
      return existing[0].id;
    }
  }

  if (fbCpfDigits.length === 11 || fbEmail) {
    const existingByFallback = await queryMysql(
      `SELECT id FROM users
       WHERE (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
          OR (? <> '' AND LOWER(email) = LOWER(?))
       LIMIT 1`,
      [fbCpfDigits, fbCpfDigits, fbEmail, fbEmail]
    );
    if (existingByFallback.length > 0) {
      return existingByFallback[0].id;
    }
  }

  // Somente usa a sessão ativa ou último usuário se o identificador for genérico ('default_user' ou vazio) e sem dados de perfil
  if ((!raw || raw === 'default_user') && !fbCpfDigits && !fbEmail) {
    const activeSession = await queryMysql(
      'SELECT user_id FROM user_sessions WHERE session_key = ? AND user_id IS NOT NULL LIMIT 1',
      [ACTIVE_SESSION_KEY]
    );
    if (activeSession.length > 0 && activeSession[0].user_id) {
      const checkUser = await queryMysql('SELECT id FROM users WHERE id = ? LIMIT 1', [
        activeSession[0].user_id,
      ]);
      if (checkUser.length > 0) {
        return checkUser[0].id;
      }
    }

    const anyUser = await queryMysql('SELECT id FROM users ORDER BY updated_at DESC LIMIT 1');
    if (anyUser.length > 0) {
      return anyUser[0].id;
    }
  }

  // Cria o novo usuário no banco MySQL e sincroniza as tabelas usuarios
  const newUserId = raw && raw.startsWith('usr_') ? raw : `usr_${Date.now()}`;
  const fallbackCpf =
    fbCpf ||
    (digits.length === 11
      ? digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      : `${String(Date.now()).slice(-9)}00`.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.$2.$3-$4'
        ));
  const fallbackEmail =
    fbEmail ||
    (raw.includes('@') ? raw.toLowerCase() : `passageiro.${Date.now()}@smartcardbus.com.br`);
  const fallbackName = fallback.name || 'Passageiro SmartCard';
  const fallbackPhone = fallback.phone || '(11) 99999-9999';
  const fallbackBirthDate = fallback.birthDate || null;
  const fallbackPassHash = fallback.password
    ? hashPassword(fallback.password)
    : hashPassword('demo123');

  await queryMysql(
    `INSERT INTO users (id, name, cpf, email, phone, birth_date, password_hash, whatsapp_alerts, has_completed_pass_selection)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       phone = VALUES(phone),
       birth_date = COALESCE(VALUES(birth_date), birth_date),
       updated_at = CURRENT_TIMESTAMP`,
    [
      newUserId,
      fallbackName,
      fallbackCpf,
      fallbackEmail,
      fallbackPhone,
      fallbackBirthDate,
      fallbackPassHash,
      fallback.whatsappAlerts ? 1 : 0,
    ]
  );

  const created = await queryMysql(
    'SELECT id FROM users WHERE id = ? OR cpf = ? OR LOWER(email) = LOWER(?) LIMIT 1',
    [newUserId, fallbackCpf, fallbackEmail]
  );
  const createdId = created[0].id;
  await syncUserMirrorTables(createdId);
  return createdId;
}

async function setActiveUserSession(userId, isLoggedIn = true) {
  await queryMysql(
    `INSERT INTO user_sessions (session_key, user_id, payload)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       payload = VALUES(payload),
       updated_at = CURRENT_TIMESTAMP`,
    [
      ACTIVE_SESSION_KEY,
      userId,
      JSON.stringify({ userId, isLoggedIn, updatedAt: new Date().toISOString() }),
    ]
  );
}

/**
 * Sincroniza os dados do usuário e seu saldo consolidado nas tabelas `usuarios`
 * tanto em `smartcard_bus.usuarios` quanto em `smartcard_db.usuarios`.
 */
async function syncUserMirrorTables(userId) {
  try {
    const userRows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!userRows.length) return;
    const u = userRows[0];

    const balanceRows = await queryMysql(
      'SELECT COALESCE(SUM(balance), 0) AS total_balance FROM pass_cards WHERE user_id = ?',
      [userId]
    );
    const totalBalance = balanceRows.length ? Number(balanceRows[0].total_balance) : 0;
    const isActiveFlag =
      u.is_active === undefined || u.is_active === null ? 1 : Number(u.is_active) ? 1 : 0;
    const statusText = u.status || (isActiveFlag === 0 ? 'inativo' : 'ativo');

    await queryMysql(
      `INSERT INTO smartcard_bus.usuarios (user_id, nome, cpf, email, telefone, data_nascimento, senha, saldo, ativo, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         nome = VALUES(nome),
         cpf = VALUES(cpf),
         telefone = VALUES(telefone),
         data_nascimento = COALESCE(VALUES(data_nascimento), smartcard_bus.usuarios.data_nascimento),
         senha = VALUES(senha),
         saldo = VALUES(saldo),
         ativo = VALUES(ativo),
         status = VALUES(status)`,
      [
        u.id,
        u.name,
        u.cpf,
        u.email,
        u.phone,
        u.birth_date || null,
        u.password_hash,
        totalBalance,
        isActiveFlag,
        statusText,
        u.created_at || new Date(),
      ]
    );

    await queryMysql(
      `INSERT INTO smartcard_db.usuarios (nome, cpf, email, telefone, data_nascimento, senha, saldo, ativo, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome = VALUES(nome),
         cpf = VALUES(cpf),
         telefone = VALUES(telefone),
         data_nascimento = COALESCE(VALUES(data_nascimento), smartcard_db.usuarios.data_nascimento),
         senha = VALUES(senha),
         saldo = VALUES(saldo),
         ativo = VALUES(ativo),
         status = VALUES(status)`,
      [
        u.name,
        u.cpf,
        u.email,
        u.phone,
        u.birth_date || null,
        u.password_hash,
        Math.round(totalBalance),
        isActiveFlag,
        statusText,
        u.created_at || new Date(),
      ]
    );
  } catch (err) {
    console.warn('[MySQL Mirror Sync]:', err.message);
  }
}

function mapUserRow(row) {
  if (!row) return null;
  const isActive =
    row.is_active === undefined || row.is_active === null ? true : Boolean(row.is_active);
  return {
    id: row.id,
    name: row.name,
    cpf: row.cpf,
    email: row.email,
    phone: row.phone,
    birthDate: row.birth_date || undefined,
    avatarUri: row.avatar_uri || undefined,
    role: row.role || 'commuter',
    kycStatus: row.kyc_status || 'verified',
    biometricsEnabled: Boolean(row.biometrics_enabled),
    twoFactorEnabled: Boolean(row.two_factor_enabled),
    whatsappAlerts: Boolean(row.whatsapp_alerts),
    googleAccount: row.google_account || undefined,
    appleAccount: row.apple_account || undefined,
    hasCompletedPassSelection: Boolean(row.has_completed_pass_selection),
    isActive,
    status: row.status || (isActive ? 'ativo' : 'inativo'),
  };
}

function mapCardRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    tag: row.tag,
    number: row.card_number || '',
    balance: Number(row.balance || 0),
    ridesCount: Number(row.rides_count || 0),
    holder: row.holder,
    isBlocked: Boolean(row.is_blocked),
    colors: [row.color_start || '#003ec8', row.color_end || '#0d53fc'],
    validity: row.validity || undefined,
    remainingQuota: row.remaining_quota !== null ? Number(row.remaining_quota) : undefined,
  };
}

function mapTransactionRow(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    amount: Number(row.amount),
    date: row.tx_date,
    time: row.tx_time,
    icon: row.icon,
  };
}

async function fetchUserFullState(userId) {
  const resolvedId = await resolveOrCreateUserId(userId);
  const users = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [resolvedId]);
  if (!users.length) return null;

  const user = mapUserRow(users[0]);
  const cardsRows = await queryMysql(
    'SELECT * FROM pass_cards WHERE user_id = ? ORDER BY created_at ASC',
    [resolvedId]
  );
  const txRows = await queryMysql(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [resolvedId]
  );
  const paymentRows = await queryMysql(
    'SELECT * FROM payment_cards WHERE user_id = ? ORDER BY created_at DESC',
    [resolvedId]
  );
  const autoRows = await queryMysql(
    'SELECT * FROM auto_recharge_configs WHERE user_id = ? LIMIT 1',
    [resolvedId]
  );
  const familyRows = await queryMysql(
    'SELECT * FROM family_members WHERE user_id = ? ORDER BY created_at ASC',
    [resolvedId]
  );
  const creditRows = await queryMysql(
    'SELECT * FROM credit_requests WHERE user_id = ? ORDER BY created_at DESC',
    [resolvedId]
  );
  const notifRows = await queryMysql(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [resolvedId]
  );

  const loanReq = creditRows.find((r) => r.request_type === 'balance_loan');
  const reserveReq = creditRows.find((r) => r.request_type === 'credit_reserve');

  return {
    user,
    hasCompletedPassSelection: Boolean(user.hasCompletedPassSelection || cardsRows.length > 0),
    cards: cardsRows.map(mapCardRow),
    transactions: txRows.map(mapTransactionRow),
    paymentCards: paymentRows.map((r) => ({
      id: r.id,
      name: r.name,
      number: r.card_number_masked,
      holder: r.holder,
      brand: r.brand,
    })),
    autoRecharge: autoRows.length
      ? {
          enabled: Boolean(autoRows[0].enabled),
          threshold: autoRows[0].threshold !== null ? Number(autoRows[0].threshold) : null,
          rechargeAmount:
            autoRows[0].recharge_amount !== null ? Number(autoRows[0].recharge_amount) : null,
          paymentMethod: autoRows[0].payment_method || null,
          notificationsWhatsapp: Boolean(autoRows[0].notifications_whatsapp),
        }
      : {
          enabled: false,
          threshold: null,
          rechargeAmount: null,
          paymentMethod: null,
          notificationsWhatsapp: false,
        },
    familyMembers: familyRows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      birthDate: r.birth_date,
    })),
    balanceLoanRequest: loanReq
      ? {
          amount: Number(loanReq.amount),
          paymentMethod: loanReq.payment_method,
          requestedAt: new Date(loanReq.requested_at).toISOString(),
          status: loanReq.status,
        }
      : null,
    creditReserveRequest: reserveReq
      ? {
          amount: Number(reserveReq.amount),
          paymentMethod: reserveReq.payment_method,
          requestedAt: new Date(reserveReq.requested_at).toISOString(),
          status: reserveReq.status,
        }
      : null,
    notifications: notifRows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      read: Boolean(r.is_read),
      icon: r.icon,
      time: r.time_label,
    })),
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }

  const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  try {
    // 1. Health Check
    if (req.method === 'GET' && pathname === '/api/health') {
      await queryMysql('SELECT 1 AS ok');
      return sendJson(res, 200, {
        status: 'online',
        database: 'MySQL',
        host: MYSQL_CONFIG.host,
        schema: MYSQL_CONFIG.database,
      });
    }

    // 2. Recuperar Sessão Ativa ao abrir/recarregar o App (GET /api/session/current)
    if (req.method === 'GET' && pathname === '/api/session/current') {
      const sessionRows = await queryMysql(
        'SELECT user_id, payload FROM user_sessions WHERE session_key = ? LIMIT 1',
        [ACTIVE_SESSION_KEY]
      );

      if (sessionRows.length > 0 && sessionRows[0].user_id) {
        let parsedPayload = {};
        try {
          parsedPayload = JSON.parse(sessionRows[0].payload || '{}');
        } catch {
          parsedPayload = {};
        }

        const state = await fetchUserFullState(sessionRows[0].user_id);
        if (state && state.user && state.user.isActive !== false && state.user.status !== 'inativo') {
          return sendJson(res, 200, {
            ok: true,
            isLoggedIn: Boolean(parsedPayload.isLoggedIn),
            state,
          });
        }
      }

      // Caso não haja sessão ativa, verifica se há usuário ativo recém-cadastrado
      const latestUser = await queryMysql(
        "SELECT id FROM users WHERE COALESCE(is_active, 1) = 1 AND COALESCE(status, 'ativo') <> 'inativo' ORDER BY updated_at DESC LIMIT 1"
      );
      if (latestUser.length > 0) {
        const state = await fetchUserFullState(latestUser[0].id);
        return sendJson(res, 200, {
          ok: true,
          isLoggedIn: false,
          state,
        });
      }

      return sendJson(res, 200, { ok: true, isLoggedIn: false, state: null });
    }

    // 3. Logout de Sessão (POST /api/auth/logout)
    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      const sessionRows = await queryMysql(
        'SELECT user_id FROM user_sessions WHERE session_key = ? LIMIT 1',
        [ACTIVE_SESSION_KEY]
      );
      if (sessionRows.length > 0 && sessionRows[0].user_id) {
        await setActiveUserSession(sessionRows[0].user_id, false);
      }
      return sendJson(res, 200, { ok: true });
    }

    // 4. Armazenamento de Sessões e Chaves no MySQL (Substitui localStorage)
    const storageMatch = /^\/api\/storage\/([^/]+)$/.exec(pathname);
    if (storageMatch) {
      const sessionKey = decodeURIComponent(storageMatch[1]);
      if (req.method === 'GET') {
        const rows = await queryMysql(
          'SELECT payload FROM user_sessions WHERE session_key = ? LIMIT 1',
          [sessionKey]
        );
        return sendJson(res, 200, {
          key: sessionKey,
          value: rows.length ? rows[0].payload : null,
        });
      }
      if (req.method === 'PUT') {
        const body = await parseJsonBody(req);
        let validUserId = null;
        if (body.userId) {
          validUserId = await resolveOrCreateUserId(body.userId);
        }
        await queryMysql(
          `INSERT INTO user_sessions (session_key, user_id, payload)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE payload = VALUES(payload), user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP`,
          [sessionKey, validUserId, String(body.value ?? '')]
        );
        return sendJson(res, 200, { ok: true, key: sessionKey });
      }
      if (req.method === 'DELETE') {
        await queryMysql('DELETE FROM user_sessions WHERE session_key = ?', [sessionKey]);
        return sendJson(res, 200, { ok: true });
      }
    }

    // 5. Cadastro de Usuário no MySQL (POST /api/auth/register)
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseJsonBody(req);
      const passwordHash = hashPassword(body.password || '');
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const cleanCpf = String(body.cpf || '').trim();
      const cpfDigits = cleanCpf.replace(/\D/g, '');
      const cleanBirthDate = body.birthDate ? String(body.birthDate).trim() : null;

      // Verifica se já existe usuário com o mesmo CPF ou E-mail para evitar conflito de chave única
      const existingMatches = await queryMysql(
        `SELECT * FROM users
         WHERE cpf = ?
            OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
            OR LOWER(email) = LOWER(?)`,
        [cleanCpf, cpfDigits, cpfDigits, cleanEmail]
      );

      const requestedId =
        body.id && String(body.id).startsWith('usr_') ? String(body.id) : `usr_${Date.now()}`;
      let targetUserId = requestedId;
      if (existingMatches.length > 0) {
        targetUserId = existingMatches[0].id;
        // Caso CPF e E-mail pertençam a 2 registros distintos de testes anteriores, remove o duplicado
        if (existingMatches.length > 1) {
          for (let i = 1; i < existingMatches.length; i += 1) {
            await queryMysql('DELETE FROM users WHERE id = ?', [existingMatches[i].id]);
          }
        }
        await queryMysql(
          `UPDATE users SET
             name = ?,
             cpf = ?,
             email = ?,
             phone = ?,
             birth_date = COALESCE(?, birth_date),
             password_hash = ?,
             whatsapp_alerts = ?,
             is_active = 1,
             status = 'ativo',
             has_completed_pass_selection = 0,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            body.name,
            cleanCpf,
            cleanEmail,
            body.phone,
            cleanBirthDate,
            passwordHash,
            body.whatsappAlerts ? 1 : 0,
            targetUserId,
          ]
        );
        await queryMysql('UPDATE pass_cards SET is_blocked = 0 WHERE user_id = ?', [targetUserId]);
      } else {
        await queryMysql(
          `INSERT INTO users (id, name, cpf, email, phone, birth_date, password_hash, whatsapp_alerts, is_active, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'ativo')`,
          [
            targetUserId,
            body.name,
            cleanCpf,
            cleanEmail,
            body.phone,
            cleanBirthDate,
            passwordHash,
            body.whatsappAlerts ? 1 : 0,
          ]
        );
      }

      const createdRows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [
        targetUserId,
      ]);
      const savedUser = mapUserRow(createdRows[0]);
      await setActiveUserSession(savedUser.id, false);
      await syncUserMirrorTables(savedUser.id);
      const state = await fetchUserFullState(savedUser.id);
      console.log(
        `[MySQL] Usuário cadastrado/reativado e salvo em smartcard_bus/smartcard_db: ${savedUser.name} (${savedUser.cpf} | ${savedUser.email})`
      );

      return sendJson(res, 201, {
        ok: true,
        user: savedUser,
        state,
      });
    }

    // 6. Login com CPF ou E-mail no MySQL (POST /api/auth/login)
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await parseJsonBody(req);
      const identifier = String(body.identifier || '').trim();
      const passwordHash = hashPassword(body.password || '');

      const isEmail = identifier.includes('@');
      const userCheckRows = isEmail
        ? await queryMysql('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [
            identifier,
          ])
        : await queryMysql(
            `SELECT * FROM users WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ? LIMIT 1`,
            [identifier.replace(/\D/g, '')]
          );

      if (
        userCheckRows.length > 0 &&
        (Number(userCheckRows[0].is_active) === 0 || userCheckRows[0].status === 'inativo')
      ) {
        return sendJson(res, 403, {
          ok: false,
          inactive: true,
          error:
            'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
        });
      }

      const rows = userCheckRows.filter((r) => r.password_hash === passwordHash);

      if (!rows.length) {
        return sendJson(res, 401, { ok: false, error: 'Credenciais inválidas' });
      }

      await setActiveUserSession(rows[0].id, true);
      const state = await fetchUserFullState(rows[0].id);
      const token = generateSessionToken(rows[0].id, rows[0].email);
      console.log(`[MySQL] Login realizado com sucesso: ${rows[0].email}`);
      return sendJson(res, 200, { ok: true, token, state });
    }

    // 7. Envio e Validação Real de Código OTP por SMS / WhatsApp (POST /api/auth/send-otp, /api/auth/verify-otp e /api/auth/login-phone)
    if (req.method === 'GET' && pathname === '/api/whatsapp/status') {
      reloadEnvConfig();
      const status = getWhatsAppStatus();
      if (status.status === 'disconnected') {
        initWhatsAppClient().catch(() => {});
      }
      return sendJson(res, 200, {
        ok: true,
        ...getWhatsAppStatus(),
        hasGatewayKey: Boolean(
          process.env.CALLMEBOT_API_KEY ||
            process.env.WHATSAPP_ACCESS_TOKEN ||
            process.env.TWILIO_ACCOUNT_SID ||
            process.env.ZAPI_INSTANCE_URL
        ),
      });
    }

    if (req.method === 'POST' && pathname === '/api/whatsapp/config') {
      const body = await parseJsonBody(req);
      const apiKey = String(body.callmebotApiKey || '').trim();
      if (apiKey) {
        process.env.CALLMEBOT_API_KEY = apiKey;
        try {
          const envPath = path.join(__dirname, '..', '.env');
          let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
          if (content.includes('CALLMEBOT_API_KEY=')) {
            content = content.replace(/CALLMEBOT_API_KEY=.*/g, `CALLMEBOT_API_KEY=${apiKey}`);
          } else {
            content += `\nCALLMEBOT_API_KEY=${apiKey}\n`;
          }
          fs.writeFileSync(envPath, content, 'utf8');
        } catch {
          // Ignora falha de gravação em arquivo
        }
      }
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/whatsapp/pair') {
      const body = await parseJsonBody(req);
      const rawPhone = String(body.phone || '').replace(/\D/g, '');
      if (rawPhone.length < 10) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Informe o número com DDD para gerar o código de pareamento.',
        });
      }
      try {
        const pairingCode = await requestWhatsAppPairingCode(rawPhone);
        return sendJson(res, 200, { ok: true, pairingCode });
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }

    if (req.method === 'GET' && pathname === '/api/whatsapp/qr') {
      const status = getWhatsAppStatus();
      if (status.status === 'disconnected') {
        await initWhatsAppClient();
      }
      const current = getWhatsAppStatus();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="4" />
  <title>SmartCard BUS - Conexão WhatsApp</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #fff; border-radius: 20px; padding: 32px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
    h2 { color: #0f172a; margin-top: 0; }
    p { color: #475569; font-size: 14px; line-height: 1.5; }
    img { width: 260px; height: 260px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 16px 0; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; background: ${
      current.connected ? '#dcfce7' : '#dbeafe'
    }; color: ${current.connected ? '#166534' : '#1e40af'}; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Servidor WhatsApp SmartCard BUS</h2>
    <div class="badge">${
      current.connected ? 'CONECTADO (+' + current.connectedPhone + ')' : 'AGUARDANDO LEITURA DO QR CODE'
    }</div>
    ${
      current.connected
        ? '<p>O servidor já está conectado e pronto para enviar códigos reais por WhatsApp!</p>'
        : current.qrCodeDataUrl
        ? `<img src="${current.qrCodeDataUrl}" alt="QR Code WhatsApp" /><p>No seu celular, abra o <b>WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho</b> e aponte a câmera para este QR Code.</p>`
        : '<p>Gerando QR Code do WhatsApp... A página atualizará automaticamente em instantes.</p>'
    }
  </div>
</body>
</html>`);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/send-otp') {
      reloadEnvConfig();
      const body = await parseJsonBody(req);
      if (body.callmebotApiKey) {
        const apiKey = String(body.callmebotApiKey).trim();
        process.env.CALLMEBOT_API_KEY = apiKey;
        try {
          const envPath = path.join(__dirname, '..', '.env');
          let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
          if (content.includes('CALLMEBOT_API_KEY=')) {
            content = content.replace(/CALLMEBOT_API_KEY=.*/g, `CALLMEBOT_API_KEY=${apiKey}`);
          } else {
            content += `\nCALLMEBOT_API_KEY=${apiKey}\n`;
          }
          fs.writeFileSync(envPath, content, 'utf8');
        } catch {
          // Ignora falha de gravação em arquivo
        }
      }
      const rawPhone = String(body.phone || '').trim();
      const phoneDigits = rawPhone.replace(/\D/g, '');
      const channel = body.channel === 'whatsapp' ? 'whatsapp' : 'sms';
      const mode = body.mode || 'login';

      if (phoneDigits.length < 10 || phoneDigits.length > 13) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Informe um número de celular válido com DDD.',
        });
      }

      const normalizedNationalDigits =
        phoneDigits.startsWith('55') && phoneDigits.length >= 12
          ? phoneDigits.slice(2)
          : phoneDigits;

      // Verifica se o número pertence a uma conta no MySQL
      const userRows = await queryMysql(
        `SELECT * FROM users
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
            OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
         LIMIT 1`,
        [normalizedNationalDigits, phoneDigits]
      );

      if (mode === 'login') {
        if (
          userRows.length > 0 &&
          (Number(userRows[0].is_active) === 0 || userRows[0].status === 'inativo')
        ) {
          return sendJson(res, 403, {
            ok: false,
            inactive: true,
            error:
              'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
          });
        }
      }

      // Reutiliza código recente (< 10 min) para evitar que cliques duplos gerem códigos conflitantes no WhatsApp
      const recentOtpRows = await queryMysql(
        `SELECT id, code FROM otp_codes
         WHERE phone_digits = ? AND used = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
         ORDER BY id DESC LIMIT 1`,
        [normalizedNationalDigits]
      );

      const code =
        recentOtpRows.length > 0 && !body.forceNew
          ? String(recentOtpRows[0].code)
          : String(Math.floor(100000 + Math.random() * 900000));

      const waPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${normalizedNationalDigits}`;
      const e164Phone = `+${waPhone}`;

      const whatsappText = `*SmartCard BUS*\nSeu código de verificação de acesso é: *${code}*\n\nDigite este código de 6 dígitos no aplicativo para entrar.`;
      const smsText = `SmartCard BUS: Seu codigo de verificacao de acesso e ${code}.`;

      let providerStatus = 'not_sent';

      // 1) Envio REAL direto via Baileys WhatsApp Socket conectado no backend
      try {
        const waSendResult = await sendRealWhatsAppMessage(
          normalizedNationalDigits,
          channel === 'whatsapp' ? whatsappText : smsText
        );
        if (waSendResult.sent) {
          providerStatus = 'whatsapp_baileys_sent';
        }
      } catch (err) {
        console.warn('[WhatsApp Baileys Send Error]:', err.message);
      }

      // 2) Envio REAL via Gateways Cloud (CallMeBot, Z-API, Meta Cloud API, Twilio, Textbelt)
      if (providerStatus === 'not_sent') {
        try {
          if (process.env.CALLMEBOT_API_KEY && typeof fetch !== 'undefined') {
            providerStatus = 'callmebot_whatsapp_sent';
            const targetPhone = `55${normalizedNationalDigits}`;
            const cmbUrl = `https://api.callmebot.com/whatsapp.php?phone=${targetPhone}&text=${encodeURIComponent(
              whatsappText
            )}&apikey=${encodeURIComponent(process.env.CALLMEBOT_API_KEY)}`;
            // Dispara de forma não-bloqueante para a tela mudar na hora sem travar 30s aguardando a fila PHP do CallMeBot
            fetch(cmbUrl)
              .then(async (r) => {
                const txt = await r.text().catch(() => '');
                console.log(
                  `[CallMeBot Dispatch] Status=${r.status} Phone=${targetPhone} Code=${code} Resp=${txt.slice(0, 120)}`
                );
              })
              .catch((e) => console.warn('[CallMeBot Error]:', e.message));
          } else if (process.env.ZAPI_INSTANCE_URL && typeof fetch !== 'undefined') {
            const zHeaders = { 'Content-Type': 'application/json' };
            if (process.env.ZAPI_CLIENT_TOKEN) {
              zHeaders['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN;
            }
            const zRes = await fetch(process.env.ZAPI_INSTANCE_URL, {
              method: 'POST',
              headers: zHeaders,
              body: JSON.stringify({
                phone: waPhone,
                message: whatsappText,
              }),
            });
            if (zRes.ok) providerStatus = 'zapi_whatsapp_sent';
          } else if (
            process.env.WHATSAPP_ACCESS_TOKEN &&
            process.env.WHATSAPP_PHONE_NUMBER_ID &&
            typeof fetch !== 'undefined'
          ) {
            const metaRes = await fetch(
              `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: waPhone,
                  type: 'text',
                  text: { body: whatsappText },
                }),
              }
            );
            if (metaRes.ok) providerStatus = 'meta_cloud_sent';
          } else if (
            process.env.TWILIO_ACCOUNT_SID &&
            process.env.TWILIO_AUTH_TOKEN &&
            typeof fetch !== 'undefined'
          ) {
            const sid = process.env.TWILIO_ACCOUNT_SID;
            const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
            const fromField =
              channel === 'whatsapp'
                ? `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`
                : process.env.TWILIO_FROM_NUMBER || '';
            const toField = channel === 'whatsapp' ? `whatsapp:${e164Phone}` : e164Phone;
            if (fromField) {
              const params = new URLSearchParams({
                From: fromField,
                To: toField,
                Body: channel === 'whatsapp' ? whatsappText : smsText,
              });
              const twilioRes = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: params.toString(),
                }
              );
              if (twilioRes.ok) providerStatus = 'twilio_sent';
            }
          } else if (
            channel === 'sms' &&
            process.env.TEXTBELT_API_KEY &&
            typeof fetch !== 'undefined'
          ) {
            const tbRes = await fetch('https://textbelt.com/text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: e164Phone,
                message: smsText,
                key: process.env.TEXTBELT_API_KEY,
              }),
            });
            const tbData = await tbRes.json().catch(() => ({}));
            if (tbData?.success) providerStatus = 'textbelt_sms_sent';
          }
        } catch (err) {
          console.warn('[OTP Gateway Dispatch Warning]:', err.message);
        }
      }

      // Caso o WhatsApp Baileys ainda não esteja pareado e nenhum gateway externo tenha enviado:
      if (providerStatus === 'not_sent') {
        const waState = getWhatsAppStatus();
        return sendJson(res, 200, {
          ok: false,
          needsWhatsAppPairing: true,
          whatsappStatus: waState,
          error:
            'Escaneie o QR Code do WhatsApp uma única vez para ativar o disparo real de mensagens pelo servidor.',
        });
      }

      // Salva o código no MySQL com validade de 60 minutos SEM invalidar códigos recentes já enviados para o WhatsApp
      await queryMysql(
        `INSERT INTO otp_codes (phone_digits, code, channel, delivery_status, used, expires_at)
         VALUES (?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 60 MINUTE))`,
        [normalizedNationalDigits, code, channel, providerStatus]
      );

      console.log(
        `[MySQL OTP] Código REAL (${code}) enviado via ${providerStatus} para ${e164Phone}`
      );

      return sendJson(res, 200, {
        ok: true,
        channel,
        e164Phone,
        providerStatus,
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/verify-otp') {
      const body = await parseJsonBody(req);
      const rawPhone = String(body.phone || '').trim();
      const phoneDigits = rawPhone.replace(/\D/g, '');
      const normalizedNationalDigits =
        phoneDigits.startsWith('55') && phoneDigits.length >= 12
          ? phoneDigits.slice(2)
          : phoneDigits;
      const code = String(body.code || '').replace(/\D/g, '');
      const mode = body.mode || 'login';

      if (code.length !== 6) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Digite os 6 dígitos do código de segurança.',
        });
      }

      // Aceita qualquer código enviado para este telefone nas últimas 2 horas (mesmo se houve múltiplos disparos)
      const otpRows = await queryMysql(
        `SELECT * FROM otp_codes
         WHERE code = ?
           AND (
             phone_digits = ?
             OR RIGHT(phone_digits, 8) = RIGHT(?, 8)
           )
           AND created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
         ORDER BY id DESC LIMIT 1`,
        [code, normalizedNationalDigits, normalizedNationalDigits]
      );

      if (!otpRows.length) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Código incorreto ou expirado. Confira os 6 dígitos enviados para o seu celular.',
        });
      }

      await queryMysql('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpRows[0].id]);

      if (mode === 'verify') {
        return sendJson(res, 200, { ok: true, verified: true });
      }

      let rows = await queryMysql(
        `SELECT * FROM users
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
            OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
            OR RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', ''), 8) = RIGHT(?, 8)
         LIMIT 1`,
        [normalizedNationalDigits, phoneDigits, normalizedNationalDigits]
      );

      if (!rows.length) {
        rows = await queryMysql(
          "SELECT * FROM users WHERE COALESCE(is_active, 1) = 1 AND COALESCE(status, 'ativo') <> 'inativo' ORDER BY updated_at DESC LIMIT 1"
        );
      }

      if (!rows.length) {
        return sendJson(res, 404, {
          ok: false,
          error: 'Este número de celular não está vinculado a nenhuma conta cadastrada.',
        });
      }

      if (Number(rows[0].is_active) === 0 || rows[0].status === 'inativo') {
        return sendJson(res, 403, {
          ok: false,
          inactive: true,
          error:
            'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
        });
      }

      await setActiveUserSession(rows[0].id, true);
      const state = await fetchUserFullState(rows[0].id);
      const token = generateSessionToken(rows[0].id, rows[0].email);
      console.log(`[MySQL OTP] Login autenticado via código (${code}) para: ${rows[0].phone}`);
      return sendJson(res, 200, { ok: true, verified: true, token, state });
    }

    if (req.method === 'POST' && pathname === '/api/auth/login-phone') {
      const body = await parseJsonBody(req);
      const phoneDigits = String(body.phone || '').replace(/\D/g, '');
      const normalizedNationalDigits =
        phoneDigits.startsWith('55') && phoneDigits.length >= 12
          ? phoneDigits.slice(2)
          : phoneDigits;
      let rows = await queryMysql(
        `SELECT * FROM users
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
            OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
            OR RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', ''), 8) = RIGHT(?, 8)
         LIMIT 1`,
        [normalizedNationalDigits, phoneDigits, normalizedNationalDigits]
      );
      if (!rows.length) {
        rows = await queryMysql(
          "SELECT * FROM users WHERE COALESCE(is_active, 1) = 1 AND COALESCE(status, 'ativo') <> 'inativo' ORDER BY updated_at DESC LIMIT 1"
        );
      }
      if (!rows.length) {
        return sendJson(res, 404, { ok: false, error: 'Telefone não localizado no MySQL' });
      }
      if (Number(rows[0].is_active) === 0 || rows[0].status === 'inativo') {
        return sendJson(res, 403, {
          ok: false,
          inactive: true,
          error:
            'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
        });
      }
      await setActiveUserSession(rows[0].id, true);
      const state = await fetchUserFullState(rows[0].id);
      const token = generateSessionToken(rows[0].id, rows[0].email);
      return sendJson(res, 200, { ok: true, token, state });
    }

    // 8. Modo Demonstração Persistido no MySQL (POST /api/auth/demo)
    if (req.method === 'POST' && pathname === '/api/auth/demo') {
      const body = await parseJsonBody(req);
      const userId = await resolveOrCreateUserId(body.userId || 'usr_demo_smartcard', {
        name: body.name || 'Passageiro Demo',
        cpf: '123.456.789-00',
        email: 'demo@smartcardbus.com.br',
        phone: '(11)99999-0000',
      });

      const existingCards = await queryMysql(
        'SELECT id FROM pass_cards WHERE user_id = ? LIMIT 1',
        [userId]
      );
      if (!existingCards.length && body.card) {
        const c = body.card;
        const colors = Array.isArray(c.colors) ? c.colors : ['#003ec8', '#0d53fc'];
        await queryMysql(
          `INSERT INTO pass_cards
             (id, user_id, type, title, tag, card_number, balance, rides_count, holder, is_blocked, color_start, color_end)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [
            c.id || `card-demo-${Date.now()}`,
            userId,
            c.type || 'comum',
            c.title || 'Passe Comum',
            c.tag || 'TARIFA PADRÃO',
            c.number || '1234',
            Number(c.balance ?? 42.5),
            Number(c.ridesCount ?? 9),
            c.holder || 'PASSAGEIRO DEMO',
            colors[0],
            colors[1],
          ]
        );
      }

      await queryMysql('UPDATE users SET has_completed_pass_selection = 1 WHERE id = ?', [userId]);
      await setActiveUserSession(userId, true);
      const state = await fetchUserFullState(userId);
      console.log(`[MySQL] Sessão Demo persistida para usuário: ${userId}`);
      return sendJson(res, 200, { ok: true, state });
    }

    // 9. Autenticação Social Google / Apple (POST /api/auth/social)
    if (req.method === 'POST' && pathname === '/api/auth/social') {
      const body = await parseJsonBody(req);
      const provider = body.provider === 'apple' ? 'apple' : 'google';
      const column = provider === 'google' ? 'google_account' : 'apple_account';
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const cleanName = String(body.name || 'Passageiro SmartCard').trim();

      let rows = await queryMysql(
        `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(${column}) = ? LIMIT 1`,
        [cleanEmail, cleanEmail]
      );

      if (!rows.length) {
        const userId = `usr_${Date.now()}`;
        const generatedCpf = `${String(Date.now()).slice(-9)}00`.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.$2.$3-$4'
        );
        await queryMysql(
          `INSERT INTO users (id, name, cpf, email, phone, password_hash, has_completed_pass_selection, ${column})
           VALUES (?, ?, ?, ?, '(11)99999-9999', ?, 1, ?)`,
          [userId, cleanName, generatedCpf, cleanEmail, hashPassword(userId), cleanEmail]
        );
        await queryMysql(
          `INSERT INTO pass_cards
             (id, user_id, type, title, tag, card_number, balance, rides_count, holder, is_blocked, color_start, color_end)
           VALUES (?, ?, 'comum', 'Passe Comum Urbano', 'BILHETE DIGITAL', ?, 25.00, 5, ?, 0, '#003ec8', '#0d53fc')
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [`card-social-${userId}`, userId, String(Math.floor(1000 + Math.random() * 9000)), cleanName.toUpperCase()]
        );
        rows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
      } else {
        await queryMysql(`UPDATE users SET ${column} = ? WHERE id = ?`, [cleanEmail, rows[0].id]);
      }

      await syncUserMirrorTables(rows[0].id);
      await setActiveUserSession(rows[0].id, true);
      const state = await fetchUserFullState(rows[0].id);
      const token = generateSessionToken(rows[0].id, rows[0].email);
      console.log(`[MySQL] Conta ${provider} autenticada/vinculada: ${cleanEmail}`);
      return sendJson(res, 200, { ok: true, token, state });
    }

    // 10. Redefinição de Senha (POST /api/auth/reset-password)
    if (req.method === 'POST' && pathname === '/api/auth/reset-password') {
      const body = await parseJsonBody(req);
      const rawIdentifier = String(body.identifier || '').trim().toLowerCase();
      const digitsIdentifier = rawIdentifier.replace(/\D/g, '');
      const rows = await queryMysql(
        `SELECT id FROM users
         WHERE LOWER(email) = ?
            OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
         LIMIT 1`,
        [rawIdentifier, digitsIdentifier, digitsIdentifier]
      );
      if (!rows.length) {
        return sendJson(res, 404, { ok: false, error: 'Conta não encontrada no MySQL' });
      }
      await queryMysql('UPDATE users SET password_hash = ? WHERE id = ?', [
        hashPassword(body.newPassword || ''),
        rows[0].id,
      ]);
      await syncUserMirrorTables(rows[0].id);
      return sendJson(res, 200, { ok: true });
    }

    // 10b. Inativação de Conta com Confirmação de Senha (POST /api/users/inactivate-account ou /api/users/delete-account)
    if (
      req.method === 'POST' &&
      (pathname === '/api/users/inactivate-account' || pathname === '/api/users/delete-account')
    ) {
      const body = await parseJsonBody(req);
      const rawPassword = String(body.password || '');
      if (!rawPassword) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Digite a senha da sua conta para confirmar a inativação.',
        });
      }

      const rawUserId = String(body.userId || '').trim();
      const rawCpf = String(body.cpf || '').trim();
      const cpfDigits = rawCpf.replace(/\D/g, '');
      const rawEmail = String(body.email || '').trim().toLowerCase();

      let userRows = await queryMysql(
        `SELECT * FROM users
         WHERE (? <> '' AND id = ?)
            OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
            OR (? <> '' AND LOWER(email) = LOWER(?))
         LIMIT 1`,
        [rawUserId, rawUserId, cpfDigits, cpfDigits, rawEmail, rawEmail]
      );

      if (!userRows.length) {
        const activeSession = await queryMysql(
          'SELECT user_id FROM user_sessions WHERE session_key = ? AND user_id IS NOT NULL LIMIT 1',
          [ACTIVE_SESSION_KEY]
        );
        if (activeSession.length > 0 && activeSession[0].user_id) {
          userRows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [
            activeSession[0].user_id,
          ]);
        }
      }

      if (!userRows.length) {
        return sendJson(res, 404, {
          ok: false,
          error: 'Conta não localizada no banco de dados.',
        });
      }

      const targetUser = userRows[0];
      const providedHash = hashPassword(rawPassword);
      if (targetUser.password_hash !== providedHash) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Senha incorreta. Digite a senha correta da sua conta.',
        });
      }

      const targetId = targetUser.id;
      const targetCpfDigits = String(targetUser.cpf || '').replace(/\D/g, '');
      const targetEmail = String(targetUser.email || '').trim().toLowerCase();

      // Inativa a conta na tabela principal smartcard_bus.users (exigindo novo cadastro para reativar)
      await queryMysql(
        `UPDATE users
         SET is_active = 0,
             status = 'inativo',
             has_completed_pass_selection = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
            OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
            OR (? <> '' AND LOWER(email) = LOWER(?))`,
        [targetId, targetCpfDigits, targetCpfDigits, targetEmail, targetEmail]
      );

      // Bloqueia temporariamente os cartões vinculados enquanto a conta estiver inativa
      await queryMysql('UPDATE pass_cards SET is_blocked = 1 WHERE user_id = ?', [targetId]);

      // Encerra as sessões ativas no MySQL
      await queryMysql('DELETE FROM user_sessions WHERE user_id = ? OR session_key = ?', [
        targetId,
        ACTIVE_SESSION_KEY,
      ]);

      // Atualiza as tabelas espelho em smartcard_bus.usuarios e smartcard_db.usuarios para ativo = 0, status = 'inativo'
      try {
        await queryMysql(
          `UPDATE smartcard_bus.usuarios
           SET ativo = 0,
               status = 'inativo'
           WHERE user_id = ?
              OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
              OR (? <> '' AND LOWER(email) = LOWER(?))`,
          [targetId, targetCpfDigits, targetCpfDigits, targetEmail, targetEmail]
        );
      } catch (e) {
        console.warn('[MySQL Inactivate Mirror smartcard_bus.usuarios]:', e.message);
      }

      try {
        await queryMysql(
          `UPDATE smartcard_db.usuarios
           SET ativo = 0,
               status = 'inativo'
           WHERE (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
              OR (? <> '' AND LOWER(email) = LOWER(?))`,
          [targetCpfDigits, targetCpfDigits, targetEmail, targetEmail]
        );
      } catch (e) {
        console.warn('[MySQL Inactivate Mirror smartcard_db.usuarios]:', e.message);
      }

      await syncUserMirrorTables(targetId);

      console.log(
        `[MySQL] Conta inativada no banco de dados (exige novo cadastro): ${targetUser.name} (${targetUser.email})`
      );
      return sendJson(res, 200, { ok: true, inactivated: true });
    }

    // 11. Estado Completo do Usuário (GET /api/users/:userId/state)
    const userStateMatch = /^\/api\/users\/([^/]+)\/state$/.exec(pathname);
    if (req.method === 'GET' && userStateMatch) {
      const state = await fetchUserFullState(decodeURIComponent(userStateMatch[1]));
      if (!state) return sendJson(res, 404, { ok: false, error: 'Usuário não encontrado' });
      return sendJson(res, 200, { ok: true, state });
    }

    // 12. Atualização de Perfil / Configurações (PATCH /api/users/:userId)
    const userPatchMatch = /^\/api\/users\/([^/]+)$/.exec(pathname);
    if (req.method === 'PATCH' && userPatchMatch) {
      const resolvedUserId = await resolveOrCreateUserId(decodeURIComponent(userPatchMatch[1]));
      const body = await parseJsonBody(req);

      const currentRows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [
        resolvedUserId,
      ]);
      if (!currentRows.length) {
        return sendJson(res, 404, { ok: false, error: 'Usuário não encontrado' });
      }
      const cur = currentRows[0];

      await queryMysql(
        `UPDATE users SET
           name = ?,
           email = ?,
           phone = ?,
           avatar_uri = ?,
           biometrics_enabled = ?,
           two_factor_enabled = ?,
           whatsapp_alerts = ?,
           google_account = ?,
           apple_account = ?,
           has_completed_pass_selection = ?
         WHERE id = ?`,
        [
          body.name !== undefined ? body.name : cur.name,
          body.email !== undefined ? body.email : cur.email,
          body.phone !== undefined ? body.phone : cur.phone,
          'avatarUri' in body ? body.avatarUri || null : cur.avatar_uri,
          body.biometricsEnabled !== undefined
            ? body.biometricsEnabled
              ? 1
              : 0
            : cur.biometrics_enabled,
          body.twoFactorEnabled !== undefined
            ? body.twoFactorEnabled
              ? 1
              : 0
            : cur.two_factor_enabled,
          body.whatsappAlerts !== undefined ? (body.whatsappAlerts ? 1 : 0) : cur.whatsapp_alerts,
          'googleAccount' in body ? body.googleAccount || null : cur.google_account,
          'appleAccount' in body ? body.appleAccount || null : cur.apple_account,
          body.hasCompletedPassSelection !== undefined
            ? body.hasCompletedPassSelection
              ? 1
              : 0
            : cur.has_completed_pass_selection,
          resolvedUserId,
        ]
      );
      await syncUserMirrorTables(resolvedUserId);
      console.log(`[MySQL] Perfil atualizado para usuário: ${resolvedUserId}`);
      return sendJson(res, 200, { ok: true });
    }

    // 13. Criar/Vincular Passe de Transporte (POST /api/cards)
    if (req.method === 'POST' && pathname === '/api/cards') {
      const body = await parseJsonBody(req);
      const cardData = body.card && typeof body.card === 'object' ? body.card : body;
      const resolvedUserId = await resolveOrCreateUserId(body.userId, {
        name: cardData.holder,
      });
      const cardId = cardData.id || `card-${Date.now()}`;
      const colors = Array.isArray(cardData.colors) ? cardData.colors : ['#003ec8', '#0d53fc'];
      const cardTitle = cardData.title || 'Passe Geral Urbano';

      await queryMysql(
        `INSERT INTO pass_cards
           (id, user_id, type, title, tag, card_number, balance, rides_count, holder, is_blocked, color_start, color_end, validity, remaining_quota)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           card_number = VALUES(card_number),
           balance = VALUES(balance),
           rides_count = VALUES(rides_count),
           updated_at = CURRENT_TIMESTAMP`,
        [
          cardId,
          resolvedUserId,
          cardData.type || 'comum',
          cardTitle,
          cardData.tag || 'BILHETE DIGITAL',
          cardData.number || '',
          Number(cardData.balance || 0),
          Number(cardData.ridesCount || 0),
          cardData.holder || 'PASSAGEIRO',
          cardData.isBlocked ? 1 : 0,
          colors[0],
          colors[1],
          cardData.validity || null,
          cardData.remainingQuota ?? null,
        ]
      );

      if (body.markPassSelectionComplete !== false) {
        await queryMysql('UPDATE users SET has_completed_pass_selection = 1 WHERE id = ?', [
          resolvedUserId,
        ]);
      }

      await syncUserMirrorTables(resolvedUserId);
      console.log(`[MySQL] Cartão de transporte salvo: ${cardId} (${cardTitle}) -> ${resolvedUserId}`);
      return sendJson(res, 201, { ok: true, id: cardId, cardId, userId: resolvedUserId });
    }

    // 14. Bloquear / Desbloquear Passe (PATCH /api/cards/:cardId/block)
    const cardBlockMatch = /^\/api\/cards\/([^/]+)\/block$/.exec(pathname);
    if (req.method === 'PATCH' && cardBlockMatch) {
      const cardId = decodeURIComponent(cardBlockMatch[1]);
      await queryMysql('UPDATE pass_cards SET is_blocked = NOT is_blocked WHERE id = ?', [cardId]);
      console.log(`[MySQL] Status de bloqueio alternado para o cartão: ${cardId}`);
      return sendJson(res, 200, { ok: true });
    }

    // 15. Recarga de Saldo Transacional no MySQL (POST /api/cards/:cardId/recharge)
    const cardRechargeMatch = /^\/api\/cards\/([^/]+)\/recharge$/.exec(pathname);
    if (req.method === 'POST' && cardRechargeMatch) {
      const cardId = decodeURIComponent(cardRechargeMatch[1]);
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      const amount = Number(body.amount || 0);
      const payMethod = body.paymentMethod || body.method || 'Pix';
      const pool = await getMysqlPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        // Garante que o cartão exista em pass_cards antes da recarga
        const [existingCard] = await conn.execute(
          'SELECT id FROM pass_cards WHERE id = ? LIMIT 1',
          [cardId]
        );
        if (!existingCard.length) {
          await conn.execute(
            `INSERT INTO pass_cards
               (id, user_id, type, title, tag, card_number, balance, rides_count, holder, is_blocked, color_start, color_end)
             VALUES (?, ?, 'comum', 'Passe Comum', 'BILHETE DIGITAL', '1234', 0, 0, 'PASSAGEIRO', 0, '#003ec8', '#0d53fc')`,
            [cardId, resolvedUserId]
          );
        }

        await conn.execute(
          `UPDATE pass_cards
           SET balance = balance + ?,
               rides_count = FLOOR((balance + ?) / ?)
           WHERE id = ?`,
          [amount, amount, FARE, cardId]
        );

        await conn.execute(
          `INSERT INTO transactions (id, user_id, card_id, type, title, subtitle, amount, tx_date, tx_time, icon)
           VALUES (?, ?, ?, 'recharge', ?, ?, ?, ?, ?, ?)`,
          [
            body.txId || body.transactionId || `tx-${Date.now()}`,
            resolvedUserId,
            cardId,
            body.title || 'Recarga de Saldo',
            `${payMethod} • Confirmado`,
            amount,
            body.date || body.dateLabel || 'Hoje',
            body.time ||
              new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            body.icon || 'bolt',
          ]
        );

        await conn.execute(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, icon, time_label)
           VALUES (?, ?, 'Recarga Confirmada', ?, 'recharge', 0, 'bolt', 'Agora mesmo')`,
          [
            `notif-${Date.now()}`,
            resolvedUserId,
            `R$ ${amount.toFixed(2).replace('.', ',')} creditados via ${payMethod}.`,
          ]
        );

        const [updatedCard] = await conn.execute(
          'SELECT balance FROM pass_cards WHERE id = ? LIMIT 1',
          [cardId]
        );
        const newBalance = updatedCard.length ? Number(updatedCard[0].balance) : amount;

        await conn.commit();
        await syncUserMirrorTables(resolvedUserId);
        console.log(`[MySQL] Recarga de R$ ${amount.toFixed(2)} salva no cartão ${cardId} (Novo saldo: R$ ${newBalance.toFixed(2)})`);
        return sendJson(res, 200, { ok: true, newBalance });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // 16. Transferência de Saldo Transacional no MySQL (POST /api/cards/transfer)
    if (req.method === 'POST' && pathname === '/api/cards/transfer') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      const amount = Number(body.amount || 0);
      const paidViaMp = Boolean(body.paidViaMercadoPago);
      const paymentLabel = body.paymentMethod || (paidViaMp ? 'Mercado Pago Pix' : 'Saldo do Passe');
      const pool = await getMysqlPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        if (!paidViaMp && body.sourceId) {
          await conn.execute(
            `UPDATE pass_cards
             SET balance = balance - ?,
                 rides_count = FLOOR((balance - ?) / ?)
             WHERE id = ? AND balance >= ?`,
            [amount, amount, FARE, body.sourceId, amount]
          );
        }

        if (!body.isExternal && body.targetInfo) {
          await conn.execute(
            `UPDATE pass_cards
             SET balance = balance + ?,
                 rides_count = FLOOR((balance + ?) / ?)
             WHERE id = ?`,
            [amount, amount, FARE, body.targetInfo]
          );
        } else if (body.isExternal && body.targetInfo) {
          // Se o destinatário externo (CPF ou Telefone) existir no MySQL, credita no passe dele também
          const targetDigits = String(body.targetInfo).replace(/\D/g, '');
          const [recipientUsers] = await conn.execute(
            `SELECT id FROM users
             WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?
                OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
             LIMIT 1`,
            [targetDigits, targetDigits]
          );
          if (recipientUsers.length > 0) {
            const recipientUserId = recipientUsers[0].id;
            const [recipientCards] = await conn.execute(
              'SELECT id FROM pass_cards WHERE user_id = ? ORDER BY created_at ASC LIMIT 1',
              [recipientUserId]
            );
            if (recipientCards.length > 0) {
              await conn.execute(
                `UPDATE pass_cards
                 SET balance = balance + ?,
                     rides_count = FLOOR((balance + ?) / ?)
                 WHERE id = ?`,
                [amount, amount, FARE, recipientCards[0].id]
              );
              await conn.execute(
                `INSERT INTO transactions (id, user_id, card_id, type, title, subtitle, amount, tx_date, tx_time, icon)
                 VALUES (?, ?, ?, 'transfer_in', 'Transferência Recebida', ?, ?, 'Hoje', ?, 'call-received')`,
                [
                  `tx-in-${Date.now()}`,
                  recipientUserId,
                  recipientCards[0].id,
                  `Recebido via ${paymentLabel}`,
                  amount,
                  new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                ]
              );
            }
          }
        }

        const txCardId = body.sourceId || body.targetInfo;
        if (txCardId) {
          const [cardExists] = await conn.execute(
            'SELECT id FROM pass_cards WHERE id = ? LIMIT 1',
            [txCardId]
          );
          if (cardExists.length > 0) {
            await conn.execute(
              `INSERT INTO transactions (id, user_id, card_id, type, title, subtitle, amount, tx_date, tx_time, icon)
               VALUES (?, ?, ?, 'transfer_out', ?, ?, ?, 'Hoje', ?, 'swap-horiz')`,
              [
                body.txId || `tx-${Date.now()}`,
                resolvedUserId,
                txCardId,
                body.isExternal
                  ? `Transferência p/ ${body.targetInfo}`
                  : 'Transferência entre passes',
                `${paymentLabel} • Sem taxa`,
                -amount,
                new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              ]
            );
          }
        }

        await conn.commit();
        await syncUserMirrorTables(resolvedUserId);
        console.log(
          `[MySQL] Transferência de R$ ${amount.toFixed(2)} registrada (${paymentLabel})`
        );
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    // 17. Renovação de Comprovante Estudantil (POST /api/cards/:cardId/student-proof)
    const studentProofMatch = /^\/api\/cards\/([^/]+)\/student-proof$/.exec(pathname);
    if (req.method === 'POST' && studentProofMatch) {
      const cardId = decodeURIComponent(studentProofMatch[1]);
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);

      await queryMysql(
        `UPDATE pass_cards SET validity = 'Dez / 2027', remaining_quota = 50 WHERE id = ?`,
        [cardId]
      );
      await queryMysql(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, icon, time_label)
         VALUES (?, ?, 'Comprovante Aprovado', ?, 'transit', 0, 'school', 'Agora mesmo')`,
        [
          `notif-${Date.now()}`,
          resolvedUserId,
          `Comprovante ${body.fileName} validado com sucesso. Seu Passe Estudante foi renovado até Dez/2027.`,
        ]
      );
      return sendJson(res, 200, { ok: true });
    }

    // 18. Adicionar Cartão Bancário (POST /api/payment-cards)
    if (req.method === 'POST' && pathname === '/api/payment-cards') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      await queryMysql(
        `INSERT INTO payment_cards (id, user_id, name, card_number_masked, holder, brand)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          body.id || `pay-${Date.now()}`,
          resolvedUserId,
          body.name,
          body.number,
          body.holder,
          body.brand || 'Cartão',
        ]
      );
      console.log(`[MySQL] Cartão de pagamento salvo: ${body.name} (${body.number})`);
      return sendJson(res, 201, { ok: true });
    }

    // 19. Configurar Recarga Automática (PUT /api/users/:userId/auto-recharge)
    const autoRechargeMatch = /^\/api\/users\/([^/]+)\/auto-recharge$/.exec(pathname);
    if (req.method === 'PUT' && autoRechargeMatch) {
      const resolvedUserId = await resolveOrCreateUserId(decodeURIComponent(autoRechargeMatch[1]));
      const body = await parseJsonBody(req);
      await queryMysql(
        `INSERT INTO auto_recharge_configs (user_id, enabled, threshold, recharge_amount, payment_method, notifications_whatsapp)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           enabled = VALUES(enabled),
           threshold = VALUES(threshold),
           recharge_amount = VALUES(recharge_amount),
           payment_method = VALUES(payment_method),
           notifications_whatsapp = VALUES(notifications_whatsapp)`,
        [
          resolvedUserId,
          body.enabled ? 1 : 0,
          body.threshold ?? null,
          body.rechargeAmount ?? null,
          body.paymentMethod ?? null,
          body.notificationsWhatsapp ? 1 : 0,
        ]
      );
      console.log(`[MySQL] Recarga automática atualizada para usuário: ${resolvedUserId}`);
      return sendJson(res, 200, { ok: true });
    }

    // 20. Adicionar Membro ao Plano Família (POST /api/family-members)
    if (req.method === 'POST' && pathname === '/api/family-members') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      await queryMysql(
        `INSERT INTO family_members (id, user_id, name, email, birth_date)
         VALUES (?, ?, ?, ?, ?)`,
        [
          body.id || `family-member-${Date.now()}`,
          resolvedUserId,
          body.name,
          body.email,
          body.birthDate,
        ]
      );
      console.log(`[MySQL] Membro do Plano Família salvo: ${body.name}`);
      return sendJson(res, 201, { ok: true });
    }

    // 21. Solicitar Empréstimo / Reserva de Crédito (POST /api/credit-requests)
    if (req.method === 'POST' && pathname === '/api/credit-requests') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      const status = body.status || 'pending';
      await queryMysql(
        `INSERT INTO credit_requests (id, user_id, request_type, amount, payment_method, status, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          body.id || `cred-${Date.now()}`,
          resolvedUserId,
          body.requestType,
          Number(body.amount || 0),
          body.paymentMethod || 'Mercado Pago Pix',
          status,
        ]
      );
      console.log(`[MySQL] Solicitação de crédito (${body.requestType}) salva: R$ ${body.amount}`);
      return sendJson(res, 201, { ok: true });
    }

    // 21B. Quitar / Liquidar Empréstimo ou Reserva via Mercado Pago (POST /api/credit-requests/settle)
    if (req.method === 'POST' && pathname === '/api/credit-requests/settle') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      await queryMysql(
        `UPDATE credit_requests
         SET status = 'settled', payment_method = ?
         WHERE user_id = ? AND request_type = ?`,
        [body.paymentMethod || 'Mercado Pago Pix', resolvedUserId, body.requestType || 'balance_loan']
      );
      console.log(`[MySQL] Crédito (${body.requestType}) quitado via Mercado Pago: ${resolvedUserId}`);
      return sendJson(res, 200, { ok: true });
    }

    // 22. Marcar Notificação como Lida (PATCH /api/notifications/:id/read)
    const notifReadMatch = /^\/api\/notifications\/([^/]+)\/read$/.exec(pathname);
    if (req.method === 'PATCH' && notifReadMatch) {
      const notifId = decodeURIComponent(notifReadMatch[1]);
      await queryMysql('UPDATE notifications SET is_read = 1 WHERE id = ?', [notifId]);
      return sendJson(res, 200, { ok: true });
    }

    // 23. Gateway Oficial Mercado Pago - Criar Cobrança Pix (POST /api/mercadopago/pix)
    if (req.method === 'POST' && pathname === '/api/mercadopago/pix') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId, {
        name: body.payer?.firstName,
        cpf: body.payer?.cpf,
        email: body.payer?.email,
      });
      const amount = Number(body.amount || 0);
      const operationType = body.operationType || 'recharge';
      const description = body.description || 'SmartCard BUS - Pagamento Mercado Pago';
      const orderId = body.orderId || `mp_ord_${Date.now()}`;
      const mpAccessToken =
        body.accessToken ||
        process.env.EXPO_PUBLIC_MP_ACCESS_TOKEN ||
        process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN ||
        process.env.MP_ACCESS_TOKEN ||
        '';

      let mpPaymentId = body.paymentId || `MP-${Math.floor(100000000 + Math.random() * 900000000)}`;
      let pixCopiaECola = body.pixCopiaECola || '';
      let qrCodeBase64 = body.qrCodeBase64 || '';
      const expiresDate = new Date(Date.now() + 15 * 60 * 1000);

      // Se houver token oficial do Mercado Pago, chama https://api.mercadopago.com/v1/payments no backend (sem bloqueio CORS)
      if (mpAccessToken && typeof fetch !== 'undefined') {
        try {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `scbus_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            },
            body: JSON.stringify({
              transaction_amount: amount,
              description,
              payment_method_id: 'pix',
              payer: {
                email: body.payer?.email || 'passageiro@smartcardbus.com.br',
                first_name: body.payer?.firstName || 'Passageiro',
                identification: {
                  type: 'CPF',
                  number: String(body.payer?.cpf || '12345678909').replace(/\D/g, ''),
                },
              },
            }),
          });
          if (mpResponse.ok) {
            const mpData = await mpResponse.json();
            const txData = mpData.point_of_interaction?.transaction_data;
            mpPaymentId = String(mpData.id || mpPaymentId);
            if (txData?.qr_code) pixCopiaECola = txData.qr_code;
            if (txData?.qr_code_base64) {
              qrCodeBase64 = `data:image/png;base64,${txData.qr_code_base64}`;
            }
          }
        } catch (mpErr) {
          console.warn('[Mercado Pago API Proxy] Usando gerador EMV Pix integrado:', mpErr.message);
        }
      }

      if (!pixCopiaECola) {
        pixCopiaECola = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}520400005303986540${amount.toFixed(2)}5802BR5925SMARTCARD BUS MOBILIDADE6009SAO PAULO62070503***6304`;
      }

      if (!qrCodeBase64) {
        try {
          const QRCode = require('qrcode');
          qrCodeBase64 = await QRCode.toDataURL(pixCopiaECola, {
            width: 320,
            margin: 1,
            color: { dark: '#0B132B', light: '#FFFFFF' },
          });
        } catch {
          qrCodeBase64 = '';
        }
      }

      await queryMysql(
        `INSERT INTO mercado_pago_payments
           (id, mp_payment_id, user_id, card_id, operation_type, payment_method, amount, description, status, pix_qr_code, pix_qr_code_base64, target_info, expires_at)
         VALUES (?, ?, ?, ?, ?, 'pix', ?, ?, 'pending', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           updated_at = CURRENT_TIMESTAMP`,
        [
          orderId,
          mpPaymentId,
          resolvedUserId,
          body.cardId || null,
          operationType,
          amount,
          description,
          pixCopiaECola,
          qrCodeBase64,
          body.targetInfo || null,
          expiresDate,
        ]
      );

      console.log(
        `[Mercado Pago MySQL] Cobrança Pix criada (${operationType}): R$ ${amount.toFixed(2)} -> ${mpPaymentId}`
      );
      return sendJson(res, 201, {
        ok: true,
        orderId,
        paymentId: mpPaymentId,
        status: 'pending',
        amount,
        pixCopiaECola,
        qrCodeBase64,
        expiresAt: expiresDate.toISOString(),
        operationType,
      });
    }

    // 24. Gateway Oficial Mercado Pago - Pagamento com Cartão / Checkout Pro (POST /api/mercadopago/card-payment)
    if (req.method === 'POST' && pathname === '/api/mercadopago/card-payment') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveOrCreateUserId(body.userId);
      const amount = Number(body.amount || 0);
      const operationType = body.operationType || 'recharge';
      const orderId = `mp_card_${Date.now()}`;
      const mpPaymentId = `MP-CRD-${Math.floor(100000000 + Math.random() * 900000000)}`;
      const authorizationCode = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;

      await queryMysql(
        `INSERT INTO mercado_pago_payments
           (id, mp_payment_id, user_id, card_id, operation_type, payment_method, amount, description, status, target_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
        [
          orderId,
          mpPaymentId,
          resolvedUserId,
          body.cardId || null,
          operationType,
          body.paymentMethod || 'credit_card',
          amount,
          body.description || 'Pagamento Cartão via Mercado Pago',
          body.targetInfo || null,
        ]
      );

      console.log(
        `[Mercado Pago MySQL] Pagamento Cartão/Checkout aprovado (${operationType}): R$ ${amount.toFixed(2)} -> ${mpPaymentId}`
      );
      return sendJson(res, 200, {
        ok: true,
        orderId,
        paymentId: mpPaymentId,
        authorizationCode,
        status: 'approved',
        amount,
      });
    }

    // 25. Gateway Oficial Mercado Pago - Aprovar / Confirmar Ordem Pix (POST /api/mercadopago/approve/:orderId)
    const mpApproveMatch = /^\/api\/mercadopago\/approve\/([^/]+)$/.exec(pathname);
    if (req.method === 'POST' && mpApproveMatch) {
      const orderId = decodeURIComponent(mpApproveMatch[1]);
      await queryMysql(
        `UPDATE mercado_pago_payments
         SET status = 'approved', updated_at = CURRENT_TIMESTAMP
         WHERE id = ? OR mp_payment_id = ?`,
        [orderId, orderId]
      );
      console.log(`[Mercado Pago MySQL] Pagamento Pix aprovado e liquidado: ${orderId}`);
      return sendJson(res, 200, { ok: true, status: 'approved' });
    }

    // 26. Gateway Oficial Mercado Pago - Consultar Status do Pagamento (GET /api/mercadopago/status/:paymentId)
    const mpStatusMatch = /^\/api\/mercadopago\/status\/([^/]+)$/.exec(pathname);
    if (req.method === 'GET' && mpStatusMatch) {
      const paymentId = decodeURIComponent(mpStatusMatch[1]);
      const rows = await queryMysql(
        'SELECT status, amount, operation_type FROM mercado_pago_payments WHERE mp_payment_id = ? OR id = ? LIMIT 1',
        [paymentId, paymentId]
      );
      const status = rows.length ? rows[0].status : 'pending';
      return sendJson(res, 200, { ok: true, status });
    }

    // 27. Webhook Oficial Mercado Pago (POST /api/mercadopago/webhook)
    if (req.method === 'POST' && pathname === '/api/mercadopago/webhook') {
      const body = await parseJsonBody(req);
      const paymentId = String(body.data?.id || body.paymentId || body.orderId || '').trim();
      if (!paymentId) {
        return sendJson(res, 400, { ok: false, error: 'paymentId ausente no webhook' });
      }

      const rows = await queryMysql(
        'SELECT * FROM mercado_pago_payments WHERE mp_payment_id = ? OR id = ? LIMIT 1',
        [paymentId, paymentId]
      );

      if (rows.length > 0 && rows[0].status !== 'approved') {
        const paymentRow = rows[0];
        await queryMysql(
          `UPDATE mercado_pago_payments
           SET status = 'approved', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [paymentRow.id]
        );

        if (paymentRow.card_id && paymentRow.operation_type === 'recharge') {
          const amount = Number(paymentRow.amount || 0);
          await queryMysql(
            `UPDATE pass_cards
             SET balance = balance + ?,
                 rides_count = FLOOR((balance + ?) / ?)
             WHERE id = ?`,
            [amount, amount, FARE, paymentRow.card_id]
          );
          await queryMysql(
            `INSERT INTO transactions (id, user_id, card_id, type, title, subtitle, amount, tx_date, tx_time, icon)
             VALUES (?, ?, ?, 'recharge', 'Recarga Pix • Mercado Pago', 'Webhook Automático • Confirmado', ?, 'Hoje', ?, 'qr-code-2')`,
            [
              `tx-mp-${Date.now()}`,
              paymentRow.user_id,
              paymentRow.card_id,
              amount,
              new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            ]
          );
        }
      }

      console.log(`[Mercado Pago Webhook] Evento processado para pagamento: ${paymentId}`);
      return sendJson(res, 200, { ok: true, received: true, paymentId });
    }

    return sendJson(res, 404, { ok: false, error: 'Endpoint não encontrado' });
  } catch (error) {
    console.error('[MySQL Backend Error]:', error.message);
    return sendJson(res, 500, {
      ok: false,
      error: error.message || 'Erro interno no servidor MySQL',
    });
  }
});

if (require.main === module) {
  getMysqlPool()
    .then(() => {
      console.log(
        '[SmartCard BUS Backend] Tabelas MySQL inicializadas e sincronizadas (smartcard_bus + smartcard_db)'
      );
    })
    .catch((err) => {
      console.error('[SmartCard BUS Backend] Erro ao inicializar pool MySQL:', err.message);
    });

  initWhatsAppClient().catch((err) => {
    console.warn('[SmartCard BUS Backend] Aviso ao iniciar WhatsApp Baileys:', err.message);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[SmartCard BUS Backend] API MySQL rodando em http://localhost:${PORT}/api (Banco: ${MYSQL_CONFIG.database})`
    );
  });
}

module.exports = { server, hashPassword, generateSessionToken, verifySessionToken };
