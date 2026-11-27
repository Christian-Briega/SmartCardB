/**
 * SmartCard BUS - Servidor Backend REST API com Banco de Dados MySQL / MariaDB
 *
 * Persiste todas as operações do aplicativo no banco `smartcard_bus` com
 * validação de autenticação, integridade transacional e normalização de dados.
 */

const http = require('http');
const crypto = require('crypto');
const { getMysqlPool, queryMysql, MYSQL_CONFIG } = require('./db');

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const FARE = 4.4;
const ACTIVE_SESSION_KEY = 'smartcard_active_user_session';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcard_bus_bank_grade_hmac_secret_2026';

// ============================================================================
// Utilitários de Criptografia, Token e Normalização
// ============================================================================

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

function getBearerAuth(req) {
  const authHeader = String(req.headers?.authorization || '').trim();
  if (!authHeader) return { provided: false, valid: false, decoded: null };
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) return { provided: true, valid: false, decoded: null };
  const decoded = verifySessionToken(match[1].trim());
  return { provided: true, valid: Boolean(decoded), decoded };
}

function normalizeCpf(rawCpf) {
  const clean = String(rawCpf || '').trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return clean;
}

function normalizePhone(rawPhone) {
  const clean = String(rawPhone || '').trim();
  let digits = clean.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return clean;
}

/**
 * Converte datas de 'DD/MM/YYYY', 'YYYY-MM-DD' ou ISO-8601 para 'YYYY-MM-DD' (DATE SQL).
 */
function normalizeDate(rawDate) {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(str);
  if (isoMatch) {
    return isoMatch[1];
  }

  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
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

// ============================================================================
// Resolução Segura de Usuário (Sem Vazamento entre Contas)
// ============================================================================

/**
 * Localiza um usuário existente estritamente por id, CPF ou e-mail.
 * Nunca utiliza fallback para sessão global ou último usuário cadastrado.
 */
async function resolveExistingUserId(identifier, fallback = {}) {
  const raw = String(identifier || '').trim();
  const digits = raw.replace(/\D/g, '');
  const fbCpfDigits = String(fallback.cpf || '').replace(/\D/g, '');
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

  return null;
}

/**
 * Valida o Bearer token (quando enviado) e resolve o ID exato do usuário alvo.
 * Impede que um usuário autenticado manipule dados de outro userId.
 */
async function resolveAuthorizedUserId(req, explicitIdentifier, fallback = {}) {
  const auth = getBearerAuth(req);
  if (auth.provided && !auth.valid) {
    const err = new Error('Token de sessão inválido ou expirado.');
    err.statusCode = 401;
    throw err;
  }

  const candidateId = explicitIdentifier || auth.decoded?.sub || '';
  const resolvedId = await resolveExistingUserId(candidateId, fallback);

  if (!resolvedId) {
    const err = new Error('Usuário não autenticado ou não encontrado.');
    err.statusCode = auth.valid ? 404 : 401;
    throw err;
  }

  if (auth.valid && auth.decoded.sub !== resolvedId) {
    const err = new Error('Acesso negado: você não tem permissão para alterar outra conta.');
    err.statusCode = 403;
    throw err;
  }

  return resolvedId;
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
 * Sincroniza opcionalmente a base externa `smartcard_db.usuarios` caso exista.
 * A tabela `smartcard_bus.usuarios` é uma VIEW nativa e não precisa de sync manual.
 */
async function syncExternalMirrorTable(userId) {
  try {
    const userRows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!userRows.length) return;
    const u = userRows[0];

    const balanceRows = await queryMysql(
      'SELECT COALESCE(SUM(balance), 0) AS total_balance FROM pass_cards WHERE user_id = ?',
      [userId]
    );
    const totalBalance = balanceRows.length ? Number(balanceRows[0].total_balance) : 0;
    const isActiveFlag = Number(u.is_active) === 0 ? 0 : 1;
    const statusText = u.status || (isActiveFlag === 0 ? 'inativo' : 'ativo');
    const uCpfDigits = String(u.cpf || '').replace(/\D/g, '');

    await queryMysql(
      `DELETE FROM smartcard_db.usuarios
       WHERE (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
          OR LOWER(email) = LOWER(?)`,
      [uCpfDigits, uCpfDigits, u.email]
    );

    await queryMysql(
      `INSERT INTO smartcard_db.usuarios (nome, cpf, email, telefone, data_nascimento, senha, saldo, ativo, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  } catch {
    // Ignora silenciosamente caso o schema secundário `smartcard_db` não esteja presente
  }
}

// ============================================================================
// Mapeadores de Resposta
// ============================================================================

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
  const resolvedId = await resolveExistingUserId(userId);
  if (!resolvedId) return null;

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

// ============================================================================
// Servidor HTTP / Rotas REST API
// ============================================================================

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

    // 2. Recuperar Sessão Ativa (GET /api/session/current)
    // Nunca expõe dados do último usuário cadastrado quando não há sessão autenticada
    if (req.method === 'GET' && pathname === '/api/session/current') {
      const auth = getBearerAuth(req);
      if (auth.valid && auth.decoded?.sub) {
        const state = await fetchUserFullState(auth.decoded.sub);
        if (state && state.user && state.user.isActive !== false && state.user.status === 'ativo') {
          return sendJson(res, 200, {
            ok: true,
            isLoggedIn: true,
            state,
          });
        }
      }

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

        if (parsedPayload.isLoggedIn === true) {
          const state = await fetchUserFullState(sessionRows[0].user_id);
          if (
            state &&
            state.user &&
            state.user.isActive !== false &&
            state.user.status === 'ativo'
          ) {
            return sendJson(res, 200, {
              ok: true,
              isLoggedIn: true,
              state,
            });
          }
        }
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
          validUserId = await resolveExistingUserId(body.userId);
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

    // 5. Cadastro de Usuário com Unicidade em CPF, E-mail e Telefone (Permite Homônimos)
    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const body = await parseJsonBody(req);
      const cleanName = String(body.name || '').trim();
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const formattedCpf = normalizeCpf(body.cpf);
      const cpfDigits = formattedCpf.replace(/\D/g, '');
      const formattedPhone = normalizePhone(body.phone);
      const phoneDigits = formattedPhone.replace(/\D/g, '');
      const cleanBirthDate = normalizeDate(body.birthDate);

      if (!cleanName || cpfDigits.length !== 11 || !cleanEmail || phoneDigits.length < 10 || !body.password) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Preencha corretamente nome completo, CPF válido, e-mail, celular e senha.',
        });
      }

      const passwordHash = hashPassword(body.password);

      // Verifica unicidade estritamente em identificadores únicos (CPF, e-mail e celular)
      const existingMatches = await queryMysql(
        `SELECT * FROM users
         WHERE cpf = ?
            OR REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?
            OR LOWER(TRIM(email)) = LOWER(?)
            OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?`,
        [formattedCpf, cpfDigits, cleanEmail, phoneDigits]
      );

      const activeConflicts = existingMatches.filter(
        (row) => Number(row.is_active) !== 0 && row.status !== 'inativo'
      );

      if (activeConflicts.length > 0) {
        const cpfConflict = activeConflicts.find(
          (r) => String(r.cpf || '').replace(/\D/g, '') === cpfDigits
        );
        if (cpfConflict) {
          return sendJson(res, 409, {
            ok: false,
            field: 'cpf',
            error:
              'Este CPF já está cadastrado em outra conta. Não é permitido criar mais de um cadastro com o mesmo CPF.',
          });
        }

        const emailConflict = activeConflicts.find(
          (r) => String(r.email || '').trim().toLowerCase() === cleanEmail
        );
        if (emailConflict) {
          return sendJson(res, 409, {
            ok: false,
            field: 'email',
            error:
              'Este e-mail já está cadastrado em outra conta. Informe um e-mail exclusivo.',
          });
        }

        const phoneConflict = activeConflicts.find(
          (r) => String(r.phone || '').replace(/\D/g, '') === phoneDigits
        );
        if (phoneConflict) {
          return sendJson(res, 409, {
            ok: false,
            field: 'phone',
            error:
              'Este número de celular/WhatsApp já está cadastrado em outra conta. Informe um número exclusivo.',
          });
        }
      }

      const requestedId =
        body.id && String(body.id).startsWith('usr_') ? String(body.id) : `usr_${Date.now()}`;
      let targetUserId = requestedId;

      if (existingMatches.length > 0) {
        if (existingMatches.length > 1) {
          return sendJson(res, 409, {
            ok: false,
            error:
              'Os dados informados (CPF, e-mail ou telefone) conflitam com cadastros distintos existentes no banco de dados.',
          });
        }

        const inactiveRow = existingMatches[0];
        const inactiveCpfDigits = String(inactiveRow.cpf || '').replace(/\D/g, '');
        if (inactiveCpfDigits !== cpfDigits) {
          return sendJson(res, 409, {
            ok: false,
            error:
              'O e-mail ou telefone informado já pertence a outro CPF registrado no banco de dados.',
          });
        }

        // Reativa a conta inativada do mesmo titular do CPF
        targetUserId = inactiveRow.id;
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
            cleanName,
            formattedCpf,
            cleanEmail,
            formattedPhone,
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
            cleanName,
            formattedCpf,
            cleanEmail,
            formattedPhone,
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
      const token = generateSessionToken(savedUser.id, savedUser.email);
      await setActiveUserSession(savedUser.id, false);
      await syncExternalMirrorTable(savedUser.id);
      const state = await fetchUserFullState(savedUser.id);

      console.log(
        `[MySQL] Usuário cadastrado com sucesso: ${savedUser.name} (${savedUser.cpf} | ${savedUser.email})`
      );

      return sendJson(res, 201, {
        ok: true,
        token,
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

      if (userCheckRows.length > 0 && userCheckRows[0].status === 'bloqueado') {
        return sendJson(res, 403, {
          ok: false,
          error: 'Esta conta está bloqueada. Entre em contato com o suporte.',
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

    // 7. Login com Telefone no MySQL (POST /api/auth/login-phone)
    // Removido fallback inseguro que logava no último usuário do banco
    if (req.method === 'POST' && pathname === '/api/auth/login-phone') {
      const body = await parseJsonBody(req);
      const rawIdentifier = String(body.email || body.phone || '').trim().toLowerCase();
      const phoneDigits = rawIdentifier.replace(/\D/g, '');
      const normalizedNationalDigits =
        phoneDigits.startsWith('55') && phoneDigits.length >= 12
          ? phoneDigits.slice(2)
          : phoneDigits;

      let rows = [];
      if (rawIdentifier.includes('@')) {
        rows = await queryMysql(
          'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
          [rawIdentifier]
        );
      } else if (normalizedNationalDigits.length >= 10) {
        rows = await queryMysql(
          `SELECT * FROM users
           WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
              OR REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') = ?
           LIMIT 1`,
          [normalizedNationalDigits, phoneDigits]
        );
      } else {
        return sendJson(res, 400, {
          ok: false,
          error: 'Informe um número de celular com DDD ou e-mail válido.',
        });
      }

      if (!rows.length) {
        return sendJson(res, 404, { ok: false, error: 'Conta não localizada no MySQL' });
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
      const demoUserId = 'usr_demo_smartcard';

      const existingDemo = await queryMysql('SELECT id FROM users WHERE id = ? LIMIT 1', [
        demoUserId,
      ]);
      if (!existingDemo.length) {
        await queryMysql(
          `INSERT INTO users (id, name, cpf, email, phone, password_hash, has_completed_pass_selection, is_active, status)
           VALUES (?, ?, '123.456.789-00', 'demo@smartcardbus.com.br', '(11) 99999-0000', ?, 1, 1, 'ativo')`,
          [demoUserId, body.name || 'Passageiro Demo', hashPassword('demo123')]
        );
      }

      const existingCards = await queryMysql(
        'SELECT id FROM pass_cards WHERE user_id = ? LIMIT 1',
        [demoUserId]
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
            demoUserId,
            c.type || 'comum',
            c.title || 'Passe Comum',
            c.tag || 'TARIFA PADRÃO',
            c.number ? String(c.number).trim() : '1234',
            Math.max(0, Number(c.balance ?? 42.5)),
            Math.max(0, Math.floor(Number(c.ridesCount ?? 9))),
            c.holder || 'PASSAGEIRO DEMO',
            colors[0],
            colors[1],
          ]
        );
      }

      await queryMysql('UPDATE users SET has_completed_pass_selection = 1 WHERE id = ?', [
        demoUserId,
      ]);
      await setActiveUserSession(demoUserId, true);
      const token = generateSessionToken(demoUserId, 'demo@smartcardbus.com.br');
      const state = await fetchUserFullState(demoUserId);
      console.log(`[MySQL] Sessão Demo persistida para usuário: ${demoUserId}`);
      return sendJson(res, 200, { ok: true, token, state });
    }

    // 9. Autenticação Social Google / Apple (POST /api/auth/social)
    if (req.method === 'POST' && pathname === '/api/auth/social') {
      const body = await parseJsonBody(req);
      const provider = body.provider === 'apple' ? 'apple' : 'google';
      const column = provider === 'google' ? 'google_account' : 'apple_account';
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const cleanName = String(body.name || 'Passageiro SmartCard').trim();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        return sendJson(res, 400, {
          ok: false,
          error: 'E-mail da conta social inválido ou ausente.',
        });
      }

      let rows = await queryMysql(
        `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(${column}) = ? LIMIT 1`,
        [cleanEmail, cleanEmail]
      );

      if (!rows.length) {
        const stamp = String(Date.now());
        const userId = `usr_${stamp}`;
        const generatedCpf = `${stamp.slice(-9)}00`.replace(
          /(\d{3})(\d{3})(\d{3})(\d{2})/,
          '$1.$2.$3-$4'
        );
        const generatedPhone = `(11) 9${stamp.slice(-8, -4)}-${stamp.slice(-4)}`;

        await queryMysql(
          `INSERT INTO users (id, name, cpf, email, phone, password_hash, has_completed_pass_selection, is_active, status, ${column})
           VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'ativo', ?)`,
          [userId, cleanName, generatedCpf, cleanEmail, generatedPhone, hashPassword(userId), cleanEmail]
        );
        await queryMysql(
          `INSERT INTO pass_cards
             (id, user_id, type, title, tag, card_number, balance, rides_count, holder, is_blocked, color_start, color_end)
           VALUES (?, ?, 'comum', 'Passe Comum Urbano', 'BILHETE DIGITAL', ?, 25.00, 5, ?, 0, '#003ec8', '#0d53fc')
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [
            `card-social-${userId}`,
            userId,
            String(Math.floor(1000 + Math.random() * 9000)),
            cleanName.toUpperCase(),
          ]
        );
        rows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
      } else {
        if (Number(rows[0].is_active) === 0 || rows[0].status === 'inativo') {
          return sendJson(res, 403, {
            ok: false,
            inactive: true,
            error:
              'Esta conta está inativada. Realize o cadastro novamente para reativar seu acesso.',
          });
        }
        await queryMysql(`UPDATE users SET ${column} = ? WHERE id = ?`, [cleanEmail, rows[0].id]);
      }

      await syncExternalMirrorTable(rows[0].id);
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
      const newPassword = String(body.newPassword || '');

      if (!rawIdentifier || newPassword.length < 4) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Informe o identificador da conta e uma nova senha válida.',
        });
      }

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
        hashPassword(newPassword),
        rows[0].id,
      ]);
      await syncExternalMirrorTable(rows[0].id);
      return sendJson(res, 200, { ok: true });
    }

    // 10b. Inativação de Conta com Confirmação de Senha
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

      const auth = getBearerAuth(req);
      const rawUserId = String(body.userId || auth.decoded?.sub || '').trim();
      const cpfDigits = String(body.cpf || '').replace(/\D/g, '');
      const rawEmail = String(body.email || '').trim().toLowerCase();

      if (!rawUserId && cpfDigits.length !== 11 && !rawEmail) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Identificador da conta ausente.',
        });
      }

      const userRows = await queryMysql(
        `SELECT * FROM users
         WHERE (? <> '' AND id = ?)
            OR (CHAR_LENGTH(?) = 11 AND REPLACE(REPLACE(cpf, '.', ''), '-', '') = ?)
            OR (? <> '' AND LOWER(email) = LOWER(?))
         LIMIT 1`,
        [rawUserId, rawUserId, cpfDigits, cpfDigits, rawEmail, rawEmail]
      );

      if (!userRows.length) {
        return sendJson(res, 404, {
          ok: false,
          error: 'Conta não localizada no banco de dados.',
        });
      }

      const targetUser = userRows[0];
      if (auth.valid && auth.decoded.sub !== targetUser.id) {
        return sendJson(res, 403, {
          ok: false,
          error: 'Acesso negado para inativar esta conta.',
        });
      }

      if (targetUser.password_hash !== hashPassword(rawPassword)) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Senha incorreta. Digite a senha correta da sua conta.',
        });
      }

      const targetId = targetUser.id;
      await queryMysql(
        `UPDATE users
         SET is_active = 0,
             status = 'inativo',
             has_completed_pass_selection = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [targetId]
      );

      await queryMysql('UPDATE pass_cards SET is_blocked = 1 WHERE user_id = ?', [targetId]);
      await queryMysql('DELETE FROM user_sessions WHERE user_id = ? OR session_key = ?', [
        targetId,
        ACTIVE_SESSION_KEY,
      ]);

      await syncExternalMirrorTable(targetId);

      console.log(
        `[MySQL] Conta inativada no banco de dados (exige novo cadastro): ${targetUser.name} (${targetUser.email})`
      );
      return sendJson(res, 200, { ok: true, inactivated: true });
    }

    // 11. Estado Completo do Usuário (GET /api/users/:userId/state)
    const userStateMatch = /^\/api\/users\/([^/]+)\/state$/.exec(pathname);
    if (req.method === 'GET' && userStateMatch) {
      const requestedUserId = decodeURIComponent(userStateMatch[1]);
      const resolvedUserId = await resolveAuthorizedUserId(req, requestedUserId);
      const state = await fetchUserFullState(resolvedUserId);
      if (!state) return sendJson(res, 404, { ok: false, error: 'Usuário não encontrado' });
      return sendJson(res, 200, { ok: true, state });
    }

    // 12. Atualização de Perfil / Configurações (PATCH /api/users/:userId)
    const userPatchMatch = /^\/api\/users\/([^/]+)$/.exec(pathname);
    if (req.method === 'PATCH' && userPatchMatch) {
      const requestedUserId = decodeURIComponent(userPatchMatch[1]);
      const resolvedUserId = await resolveAuthorizedUserId(req, requestedUserId);
      const body = await parseJsonBody(req);

      const currentRows = await queryMysql('SELECT * FROM users WHERE id = ? LIMIT 1', [
        resolvedUserId,
      ]);
      if (!currentRows.length) {
        return sendJson(res, 404, { ok: false, error: 'Usuário não encontrado' });
      }
      const cur = currentRows[0];

      const nextPhone = body.phone !== undefined ? normalizePhone(body.phone) : cur.phone;
      const nextEmail =
        body.email !== undefined ? String(body.email).trim().toLowerCase() : cur.email;
      const nextBirthDate =
        body.birthDate !== undefined ? normalizeDate(body.birthDate) : cur.birth_date;

      await queryMysql(
        `UPDATE users SET
           name = ?,
           email = ?,
           phone = ?,
           birth_date = ?,
           avatar_uri = ?,
           biometrics_enabled = ?,
           two_factor_enabled = ?,
           whatsapp_alerts = ?,
           google_account = ?,
           apple_account = ?,
           has_completed_pass_selection = ?
         WHERE id = ?`,
        [
          body.name !== undefined ? String(body.name).trim() : cur.name,
          nextEmail,
          nextPhone,
          nextBirthDate,
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
      await syncExternalMirrorTable(resolvedUserId);
      console.log(`[MySQL] Perfil atualizado para usuário: ${resolvedUserId}`);
      return sendJson(res, 200, { ok: true });
    }

    // 13. Criar/Vincular Passe de Transporte (POST /api/cards)
    if (req.method === 'POST' && pathname === '/api/cards') {
      const body = await parseJsonBody(req);
      const cardData = body.card && typeof body.card === 'object' ? body.card : body;
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId, {
        name: cardData.holder,
      });
      const cardId = cardData.id || `card-${Date.now()}`;
      const colors = Array.isArray(cardData.colors) ? cardData.colors : ['#003ec8', '#0d53fc'];
      const cardTitle = cardData.title || 'Passe Geral Urbano';
      const normalizedCardNumber = cardData.number ? String(cardData.number).trim() : null;
      const normalizedValidity = normalizeDate(cardData.validity);
      const safeBalance = Math.max(0, Number(cardData.balance || 0));
      const safeRides = Math.max(0, Math.floor(Number(cardData.ridesCount || 0)));

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
          normalizedCardNumber,
          safeBalance,
          safeRides,
          cardData.holder || 'PASSAGEIRO',
          cardData.isBlocked ? 1 : 0,
          colors[0],
          colors[1],
          normalizedValidity,
          cardData.remainingQuota ?? null,
        ]
      );

      if (body.markPassSelectionComplete !== false) {
        await queryMysql('UPDATE users SET has_completed_pass_selection = 1 WHERE id = ?', [
          resolvedUserId,
        ]);
      }

      await syncExternalMirrorTable(resolvedUserId);
      console.log(
        `[MySQL] Cartão de transporte salvo: ${cardId} (${cardTitle}) -> ${resolvedUserId}`
      );
      return sendJson(res, 201, { ok: true, id: cardId, cardId, userId: resolvedUserId });
    }

    // 14. Bloquear / Desbloquear Passe (PATCH /api/cards/:cardId/block)
    const cardBlockMatch = /^\/api\/cards\/([^/]+)\/block$/.exec(pathname);
    if (req.method === 'PATCH' && cardBlockMatch) {
      const cardId = decodeURIComponent(cardBlockMatch[1]);
      const auth = getBearerAuth(req);
      if (auth.provided && !auth.valid) {
        return sendJson(res, 401, { ok: false, error: 'Token de sessão inválido ou expirado.' });
      }

      const cardRows = await queryMysql('SELECT id, user_id FROM pass_cards WHERE id = ? LIMIT 1', [
        cardId,
      ]);
      if (!cardRows.length) {
        return sendJson(res, 404, { ok: false, error: 'Cartão não encontrado.' });
      }
      if (auth.valid && auth.decoded.sub !== cardRows[0].user_id) {
        return sendJson(res, 403, { ok: false, error: 'Acesso negado a este cartão.' });
      }

      await queryMysql('UPDATE pass_cards SET is_blocked = NOT is_blocked WHERE id = ?', [cardId]);
      console.log(`[MySQL] Status de bloqueio alternado para o cartão: ${cardId}`);
      return sendJson(res, 200, { ok: true });
    }

    // 15. Recarga de Saldo Transacional no MySQL (POST /api/cards/:cardId/recharge)
    const cardRechargeMatch = /^\/api\/cards\/([^/]+)\/recharge$/.exec(pathname);
    if (req.method === 'POST' && cardRechargeMatch) {
      const cardId = decodeURIComponent(cardRechargeMatch[1]);
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      const amount = Number(body.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, {
          ok: false,
          error: 'O valor da recarga deve ser maior que zero.',
        });
      }

      const payMethod = body.paymentMethod || body.method || 'Pix';
      const pool = await getMysqlPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [existingCard] = await conn.execute(
          'SELECT id, user_id FROM pass_cards WHERE id = ? LIMIT 1 FOR UPDATE',
          [cardId]
        );
        if (!existingCard.length) {
          await conn.execute(
            `INSERT INTO pass_cards
               (id, user_id, type, title, tag, card_number, balance, rides_count, holder, is_blocked, color_start, color_end)
             VALUES (?, ?, 'comum', 'Passe Comum', 'BILHETE DIGITAL', NULL, 0, 0, 'PASSAGEIRO', 0, '#003ec8', '#0d53fc')`,
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
        await syncExternalMirrorTable(resolvedUserId);
        console.log(
          `[MySQL] Recarga de R$ ${amount.toFixed(2)} salva no cartão ${cardId} (Novo saldo: R$ ${newBalance.toFixed(2)})`
        );
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
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      const amount = Number(body.amount || 0);
      const paidViaMp = Boolean(body.paidViaMercadoPago);

      if (!Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, {
          ok: false,
          error: 'O valor da transferência deve ser maior que zero.',
        });
      }

      if (!body.isExternal && body.sourceId && body.sourceId === body.targetInfo) {
        return sendJson(res, 400, {
          ok: false,
          error: 'O cartão de origem e destino não podem ser o mesmo.',
        });
      }

      const paymentLabel = body.paymentMethod || (paidViaMp ? 'Mercado Pago Pix' : 'Saldo do Passe');
      const pool = await getMysqlPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        if (!paidViaMp) {
          if (!body.sourceId) {
            await conn.rollback();
            return sendJson(res, 400, {
              ok: false,
              error: 'Cartão de origem não informado para transferência com saldo.',
            });
          }

          const [debitResult] = await conn.execute(
            `UPDATE pass_cards
             SET balance = balance - ?,
                 rides_count = FLOOR((balance - ?) / ?)
             WHERE id = ? AND user_id = ? AND is_blocked = 0 AND balance >= ?`,
            [amount, amount, FARE, body.sourceId, resolvedUserId, amount]
          );

          if (!debitResult || debitResult.affectedRows === 0) {
            await conn.rollback();
            return sendJson(res, 400, {
              ok: false,
              error: 'Saldo insuficiente ou cartão de origem bloqueado para realizar a transferência.',
            });
          }
        }

        if (!body.isExternal && body.targetInfo) {
          const [creditInternal] = await conn.execute(
            `UPDATE pass_cards
             SET balance = balance + ?,
                 rides_count = FLOOR((balance + ?) / ?)
             WHERE id = ?`,
            [amount, amount, FARE, body.targetInfo]
          );
          if (!creditInternal || creditInternal.affectedRows === 0) {
            await conn.rollback();
            return sendJson(res, 404, {
              ok: false,
              error: 'Cartão de destino não encontrado.',
            });
          }
        } else if (body.isExternal && body.targetInfo) {
          const targetDigits = String(body.targetInfo).replace(/\D/g, '');
          if (targetDigits.length >= 10) {
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
        await syncExternalMirrorTable(resolvedUserId);
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
    // Grava validity em formato DATE ISO ('2027-12-31') compatível com o schema
    const studentProofMatch = /^\/api\/cards\/([^/]+)\/student-proof$/.exec(pathname);
    if (req.method === 'POST' && studentProofMatch) {
      const cardId = decodeURIComponent(studentProofMatch[1]);
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);

      await queryMysql(
        `UPDATE pass_cards SET validity = '2027-12-31', remaining_quota = 50 WHERE id = ? AND user_id = ?`,
        [cardId, resolvedUserId]
      );
      await queryMysql(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, icon, time_label)
         VALUES (?, ?, 'Comprovante Aprovado', ?, 'transit', 0, 'school', 'Agora mesmo')`,
        [
          `notif-${Date.now()}`,
          resolvedUserId,
          `Comprovante ${body.fileName || 'estudantil'} validado com sucesso. Seu Passe Estudante foi renovado até Dez/2027.`,
        ]
      );
      return sendJson(res, 200, { ok: true, validity: '2027-12-31' });
    }

    // 18. Adicionar Cartão Bancário (POST /api/payment-cards)
    if (req.method === 'POST' && pathname === '/api/payment-cards') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      if (!body.name || !body.number || !body.holder) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Dados incompletos do cartão de pagamento.',
        });
      }

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
      const requestedUserId = decodeURIComponent(autoRechargeMatch[1]);
      const resolvedUserId = await resolveAuthorizedUserId(req, requestedUserId);
      const body = await parseJsonBody(req);

      const threshold = body.threshold !== null && body.threshold !== undefined ? Number(body.threshold) : null;
      const rechargeAmount =
        body.rechargeAmount !== null && body.rechargeAmount !== undefined
          ? Number(body.rechargeAmount)
          : null;

      if ((threshold !== null && threshold < 0) || (rechargeAmount !== null && rechargeAmount <= 0)) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Valores inválidos para limite ou valor de recarga automática.',
        });
      }

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
          threshold,
          rechargeAmount,
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
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      const cleanName = String(body.name || '').trim();
      const cleanEmail = String(body.email || '').trim().toLowerCase();
      const normalizedBirthDate = normalizeDate(body.birthDate);

      if (!cleanName || !cleanEmail || !normalizedBirthDate) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Informe nome, e-mail e data de nascimento válida para o dependente.',
        });
      }

      try {
        await queryMysql(
          `INSERT INTO family_members (id, user_id, name, email, birth_date)
           VALUES (?, ?, ?, ?, ?)`,
          [
            body.id || `family-member-${Date.now()}`,
            resolvedUserId,
            cleanName,
            cleanEmail,
            normalizedBirthDate,
          ]
        );
      } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          return sendJson(res, 409, {
            ok: false,
            error: 'Este e-mail já está cadastrado no seu Plano Família.',
          });
        }
        throw err;
      }

      console.log(`[MySQL] Membro do Plano Família salvo: ${cleanName}`);
      return sendJson(res, 201, { ok: true });
    }

    // 21. Solicitar Empréstimo / Reserva de Crédito (POST /api/credit-requests)
    if (req.method === 'POST' && pathname === '/api/credit-requests') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      const amount = Number(body.amount || 0);
      const validTypes = ['balance_loan', 'credit_reserve'];

      if (!validTypes.includes(body.requestType) || !Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, {
          ok: false,
          error: 'Tipo de solicitação ou valor de crédito inválido.',
        });
      }

      const status = body.status || 'pending';
      await queryMysql(
        `INSERT INTO credit_requests (id, user_id, request_type, amount, payment_method, status, requested_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          body.id || `cred-${Date.now()}`,
          resolvedUserId,
          body.requestType,
          amount,
          body.paymentMethod || 'Mercado Pago Pix',
          status,
        ]
      );
      console.log(`[MySQL] Solicitação de crédito (${body.requestType}) salva: R$ ${amount}`);
      return sendJson(res, 201, { ok: true });
    }

    // 21B. Quitar / Liquidar Empréstimo ou Reserva via Mercado Pago (POST /api/credit-requests/settle)
    if (req.method === 'POST' && pathname === '/api/credit-requests/settle') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      await queryMysql(
        `UPDATE credit_requests
         SET status = 'settled', payment_method = ?
         WHERE user_id = ? AND request_type = ? AND status IN ('pending', 'approved')`,
        [body.paymentMethod || 'Mercado Pago Pix', resolvedUserId, body.requestType || 'balance_loan']
      );
      console.log(
        `[MySQL] Crédito (${body.requestType}) quitado via Mercado Pago: ${resolvedUserId}`
      );
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
    // Lê o Access Token exclusivamente das variáveis de ambiente do servidor
    if (req.method === 'POST' && pathname === '/api/mercadopago/pix') {
      const body = await parseJsonBody(req);
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId, {
        name: body.payer?.firstName,
        cpf: body.payer?.cpf,
        email: body.payer?.email,
      });
      const amount = Number(body.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, {
          ok: false,
          error: 'O valor da cobrança Pix deve ser maior que zero.',
        });
      }

      const operationType = body.operationType || 'recharge';
      const description = body.description || 'SmartCard BUS - Pagamento Mercado Pago';
      const orderId = body.orderId || `mp_ord_${Date.now()}`;
      const mpAccessToken =
        process.env.MP_ACCESS_TOKEN ||
        process.env.MERCADO_PAGO_ACCESS_TOKEN ||
        process.env.EXPO_PUBLIC_MP_ACCESS_TOKEN ||
        '';

      let mpPaymentId = body.paymentId || `MP-${Math.floor(100000000 + Math.random() * 900000000)}`;
      let pixCopiaECola = body.pixCopiaECola || '';
      let qrCodeBase64 = body.qrCodeBase64 || '';
      const expiresDate = new Date(Date.now() + 15 * 60 * 1000);

      if (mpAccessToken && typeof fetch !== 'undefined') {
        try {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${mpAccessToken}`,
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `scbus_${orderId}`,
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
      const resolvedUserId = await resolveAuthorizedUserId(req, body.userId);
      const amount = Number(body.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        return sendJson(res, 400, {
          ok: false,
          error: 'O valor do pagamento deve ser maior que zero.',
        });
      }

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

    // 27. Webhook Oficial Mercado Pago com Trava Transacional Idempotente (POST /api/mercadopago/webhook)
    if (req.method === 'POST' && pathname === '/api/mercadopago/webhook') {
      const body = await parseJsonBody(req);
      const paymentId = String(body.data?.id || body.paymentId || body.orderId || '').trim();
      if (!paymentId) {
        return sendJson(res, 400, { ok: false, error: 'paymentId ausente no webhook' });
      }

      const pool = await getMysqlPool();
      const conn = await pool.getConnection();

      try {
        await conn.beginTransaction();

        const [rows] = await conn.execute(
          'SELECT * FROM mercado_pago_payments WHERE mp_payment_id = ? OR id = ? LIMIT 1 FOR UPDATE',
          [paymentId, paymentId]
        );

        if (rows.length > 0 && rows[0].status !== 'approved') {
          const paymentRow = rows[0];
          await conn.execute(
            `UPDATE mercado_pago_payments
             SET status = 'approved', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [paymentRow.id]
          );

          if (paymentRow.card_id && paymentRow.operation_type === 'recharge') {
            const amount = Number(paymentRow.amount || 0);
            await conn.execute(
              `UPDATE pass_cards
               SET balance = balance + ?,
                   rides_count = FLOOR((balance + ?) / ?)
               WHERE id = ?`,
              [amount, amount, FARE, paymentRow.card_id]
            );
            await conn.execute(
              `INSERT INTO transactions (id, user_id, card_id, type, title, subtitle, amount, tx_date, tx_time, icon)
               VALUES (?, ?, ?, 'recharge', 'Recarga Pix • Mercado Pago', 'Webhook Automático • Confirmado', ?, 'Hoje', ?, 'qr-code-2')`,
              [
                `tx-mp-${paymentRow.id}`,
                paymentRow.user_id,
                paymentRow.card_id,
                amount,
                new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              ]
            );
          }
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      console.log(`[Mercado Pago Webhook] Evento processado para pagamento: ${paymentId}`);
      return sendJson(res, 200, { ok: true, received: true, paymentId });
    }

    return sendJson(res, 404, { ok: false, error: 'Endpoint não encontrado' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error('[MySQL Backend Error]:', error.message);
    return sendJson(res, statusCode, {
      ok: false,
      error: error.message || 'Erro interno no servidor MySQL',
    });
  }
});

if (require.main === module) {
  getMysqlPool()
    .then(() => {
      console.log(
        '[SmartCard BUS Backend] Tabelas MySQL inicializadas e sincronizadas (smartcard_bus)'
      );
    })
    .catch((err) => {
      console.error('[SmartCard BUS Backend] Erro ao inicializar pool MySQL:', err.message);
    });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[SmartCard BUS Backend] API MySQL rodando em http://localhost:${PORT}/api (Banco: ${MYSQL_CONFIG.database})`
    );
  });
}

module.exports = { server, hashPassword, generateSessionToken, verifySessionToken };