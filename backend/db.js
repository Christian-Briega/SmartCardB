const MYSQL_CONFIG = {
  host,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'smartcard_bus',
  timezone: 'Z',
  dateStrings: ['DATE'],
  ssl: isRemoteHost
    ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false,
      }
    : undefined,
  waitForConnections: true,
  connectionLimit: isRemoteHost ? 5 : 10,
  queueLimit: 0,
  multipleStatements: true,
};

let pool = null;

/**
 * Aplica schema.sql e migrações seguras de alinhamento estrutural
 * sem remover homônimos nem recriar índices duplicados.
 */
async function runBootstrapMigrations() {
  const mysql = require('mysql2/promise');

  const bootstrapConn = await mysql.createConnection({
    host: MYSQL_CONFIG.host,
    port: MYSQL_CONFIG.port,
    user: MYSQL_CONFIG.user,
    password: MYSQL_CONFIG.password,
    timezone: 'Z',
    ssl: MYSQL_CONFIG.ssl,
    multipleStatements: true,
  });

  try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await bootstrapConn.query(schemaSql);
    }

    // Migrações seguras de alinhamento com o schema otimizado (sem UNIQUE em name/nome)
    const safeMigrations = [
      // Remove índices redundantes e restrição UNIQUE indevida no nome completo
      'ALTER TABLE smartcard_bus.users DROP INDEX uk_users_name',
      'ALTER TABLE smartcard_bus.users DROP INDEX idx_users_cpf',
      'ALTER TABLE smartcard_bus.users DROP INDEX idx_users_email',
      'ALTER TABLE smartcard_bus.users DROP INDEX idx_users_phone',
      'ALTER TABLE smartcard_bus.users ADD INDEX idx_users_name (name)',

      // Garante colunas e tipos padronizados em users
      'ALTER TABLE smartcard_bus.users ADD COLUMN birth_date DATE NULL AFTER phone',
      'ALTER TABLE smartcard_bus.users MODIFY COLUMN birth_date DATE NULL',
      'ALTER TABLE smartcard_bus.users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER has_completed_pass_selection',
      "ALTER TABLE smartcard_bus.users ADD COLUMN status ENUM('ativo','inativo','bloqueado','pendente') NOT NULL DEFAULT 'ativo' AFTER is_active",

      // Garante tipos padronizados em pass_cards e family_members
      "ALTER TABLE smartcard_bus.pass_cards MODIFY COLUMN type VARCHAR(32) NOT NULL DEFAULT 'comum'",
      'ALTER TABLE smartcard_bus.pass_cards MODIFY COLUMN validity DATE NULL',
      'ALTER TABLE smartcard_bus.pass_cards MODIFY COLUMN rides_count INT UNSIGNED NOT NULL DEFAULT 0',
      'ALTER TABLE smartcard_bus.family_members MODIFY COLUMN birth_date DATE NOT NULL',

      // Garante unicidade de transações externas Mercado Pago e cartões por usuário
      'ALTER TABLE smartcard_bus.mercado_pago_payments ADD UNIQUE INDEX uk_mp_payments_mp_id (mp_payment_id)',
      'ALTER TABLE smartcard_bus.pass_cards ADD UNIQUE INDEX uk_pass_cards_user_number (user_id, card_number)',

      // Mantém smartcard_bus.usuarios como VIEW sempre atualizada
      'DROP TABLE IF EXISTS smartcard_bus.usuarios',
      `CREATE OR REPLACE VIEW smartcard_bus.usuarios AS
       SELECT
         ROW_NUMBER() OVER (ORDER BY u.created_at ASC) AS id,
         u.id AS user_id,
         u.name AS nome,
         u.cpf,
         u.email,
         u.phone AS telefone,
         u.birth_date AS data_nascimento,
         u.password_hash AS senha,
         COALESCE((SELECT SUM(c.balance) FROM smartcard_bus.pass_cards c WHERE c.user_id = u.id), 0.00) AS saldo,
         u.is_active AS ativo,
         u.status,
         u.created_at AS criado_em
       FROM smartcard_bus.users u`,
    ];

    for (const sql of safeMigrations) {
      try {
        await bootstrapConn.query(sql);
      } catch {
        // Ignora caso o índice/coluna já esteja no estado esperado
      }
    }
  } finally {
    await bootstrapConn.end().catch(() => {});
  }
}

async function getMysqlPool() {
  if (pool) return pool;

  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch {
    throw new Error(
      'Driver mysql2 não encontrado. Execute "npm install mysql2" para conectar ao servidor MySQL.'
    );
  }

  if (!process.env.VERCEL && !isRemoteHost) {
    await runBootstrapMigrations();
  }

  pool = mysql.createPool(MYSQL_CONFIG);
  return pool;
}

async function queryMysql(sql, params = []) {
  const activePool = await getMysqlPool();
  const safeParams = Array.isArray(params)
    ? params.map((param) => (param === undefined ? null : param))
    : [];
  const [rows] = await activePool.execute(sql, safeParams);
  return rows;
}

async function closeMysqlPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  MYSQL_CONFIG,
  getMysqlPool,
  queryMysql,
  closeMysqlPool,
  runBootstrapMigrations,
};