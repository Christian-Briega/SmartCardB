/**
 * SmartCard BUS - Pool de Conexão com Banco de Dados MySQL
 * Gerencia conexões seguras com MySQL 8.0+ e inicialização automática das tabelas.
 */

const fs = require('fs');
const path = require('path');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'smartcard_bus',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true,
};

let pool = null;

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

  // Cria o banco de dados caso ainda não exista e aplica o schema.sql
  const bootstrapConn = await mysql.createConnection({
    host: MYSQL_CONFIG.host,
    port: MYSQL_CONFIG.port,
    user: MYSQL_CONFIG.user,
    password: MYSQL_CONFIG.password,
    multipleStatements: true,
  });

  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await bootstrapConn.query(schemaSql);
  }

  // Migrações seguras para garantir todas as colunas e tipos em smartcard_bus e smartcard_db
  const safeMigrations = [
    "ALTER TABLE smartcard_bus.users ADD COLUMN birth_date VARCHAR(20) NULL AFTER phone",
    "ALTER TABLE smartcard_bus.users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER has_completed_pass_selection",
    "ALTER TABLE smartcard_bus.users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ativo' AFTER is_active",
    "ALTER TABLE smartcard_bus.usuarios ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER saldo",
    "ALTER TABLE smartcard_bus.usuarios ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ativo' AFTER ativo",
    "ALTER TABLE smartcard_bus.pass_cards MODIFY COLUMN type VARCHAR(32) NOT NULL DEFAULT 'comum'",
    `CREATE DATABASE IF NOT EXISTS smartcard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS smartcard_db.usuarios (
      id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      cpf VARCHAR(20) NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      telefone VARCHAR(30) NULL,
      data_nascimento VARCHAR(20) NULL,
      senha VARCHAR(255) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      saldo INT(11) NULL DEFAULT 42,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      status VARCHAR(20) NOT NULL DEFAULT 'ativo'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    "ALTER TABLE smartcard_db.usuarios ADD COLUMN cpf VARCHAR(20) NULL AFTER nome",
    "ALTER TABLE smartcard_db.usuarios ADD COLUMN telefone VARCHAR(30) NULL AFTER email",
    "ALTER TABLE smartcard_db.usuarios ADD COLUMN data_nascimento VARCHAR(20) NULL AFTER telefone",
    "ALTER TABLE smartcard_db.usuarios ADD COLUMN ativo TINYINT(1) NOT NULL DEFAULT 1 AFTER saldo",
    "ALTER TABLE smartcard_db.usuarios ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ativo' AFTER ativo",
    `CREATE TABLE IF NOT EXISTS smartcard_bus.otp_codes (
      id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
      phone_digits VARCHAR(20) NOT NULL,
      code VARCHAR(10) NOT NULL,
      channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
      delivery_status VARCHAR(40) NOT NULL DEFAULT 'dispatched',
      used TINYINT(1) NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otp_phone (phone_digits)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of safeMigrations) {
    try {
      await bootstrapConn.query(sql);
    } catch {
      // Ignora caso a coluna já exista
    }
  }

  // Sincroniza usuários já existentes em smartcard_bus.users para smartcard_bus.usuarios e smartcard_db.usuarios
  try {
    await bootstrapConn.query(`
      INSERT INTO smartcard_bus.usuarios (user_id, nome, cpf, email, telefone, data_nascimento, senha, saldo, ativo, status, criado_em)
      SELECT u.id, u.name, u.cpf, u.email, u.phone, u.birth_date, u.password_hash,
             COALESCE((SELECT SUM(c.balance) FROM smartcard_bus.pass_cards c WHERE c.user_id = u.id), 0),
             COALESCE(u.is_active, 1),
             COALESCE(u.status, CASE WHEN u.is_active = 0 THEN 'inativo' ELSE 'ativo' END),
             u.created_at
      FROM smartcard_bus.users u
      ON DUPLICATE KEY UPDATE
        nome = VALUES(nome),
        cpf = VALUES(cpf),
        telefone = VALUES(telefone),
        data_nascimento = COALESCE(VALUES(data_nascimento), smartcard_bus.usuarios.data_nascimento),
        senha = VALUES(senha),
        ativo = VALUES(ativo),
        status = VALUES(status)
    `);
    await bootstrapConn.query(`
      INSERT INTO smartcard_db.usuarios (nome, cpf, email, telefone, data_nascimento, senha, ativo, status, criado_em)
      SELECT u.name, u.cpf, u.email, u.phone, u.birth_date, u.password_hash,
             COALESCE(u.is_active, 1),
             COALESCE(u.status, CASE WHEN u.is_active = 0 THEN 'inativo' ELSE 'ativo' END),
             u.created_at
      FROM smartcard_bus.users u
      ON DUPLICATE KEY UPDATE
        nome = VALUES(nome),
        cpf = VALUES(cpf),
        telefone = VALUES(telefone),
        data_nascimento = COALESCE(VALUES(data_nascimento), smartcard_db.usuarios.data_nascimento),
        senha = VALUES(senha),
        ativo = VALUES(ativo),
        status = VALUES(status)
    `);
  } catch {
    // Ignora falha silenciosa de sincronização inicial
  }

  await bootstrapConn.end();

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
};

