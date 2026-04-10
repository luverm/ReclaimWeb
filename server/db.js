const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL || "";
const usePostgres = Boolean(DATABASE_URL);

let sqliteDb = null;
let pool = null;

function createSqliteDb() {
  const dataDir = path.join(process.cwd(), "server", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return new DatabaseSync(path.join(dataDir, "reclaim-web.sqlite"));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function publicUser(row) {
  if (!row) {
    return null;
  }

  const aiProvider = row.ai_provider || "openai";
  const hasOpenAiKey = Boolean(row.openai_api_key);
  const hasAnthropicKey = Boolean(row.anthropic_api_key);

  return {
    id: Number(row.id),
    fullName: row.full_name,
    company: row.company,
    email: row.email,
    aiProvider,
    preferredModel: row.preferred_model,
    hasApiKey: aiProvider === "anthropic" ? hasAnthropicKey : hasOpenAiKey,
    availableProviders: {
      openai: hasOpenAiKey,
      anthropic: hasAnthropicKey
    },
    brand: {
      name: row.brand_name,
      tone: row.brand_tone,
      primaryColor: row.brand_primary_color,
      rules: row.brand_rules
    }
  };
}

function ensureSqliteColumn(name, definition) {
  const columns = sqliteDb.prepare("PRAGMA table_info(users)").all();
  if (columns.some((column) => column.name === name)) {
    return;
  }

  sqliteDb.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
}

async function initializeDatabase() {
  if (usePostgres) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "disable" ? false : { rejectUnauthorized: false }
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        company TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        ai_provider TEXT DEFAULT 'openai',
        openai_api_key TEXT DEFAULT '',
        anthropic_api_key TEXT DEFAULT '',
        preferred_model TEXT DEFAULT 'gpt-4o-mini',
        brand_name TEXT DEFAULT '',
        brand_tone TEXT DEFAULT 'clear, confident, technical',
        brand_primary_color TEXT DEFAULT '#101113',
        brand_rules TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );
    `);

    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'openai'");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key TEXT DEFAULT ''");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT DEFAULT ''");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_model TEXT DEFAULT 'gpt-4o-mini'");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT ''");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_tone TEXT DEFAULT 'clear, confident, technical'");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#101113'");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_rules TEXT DEFAULT ''");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL
      );
    `);

    return;
  }

  sqliteDb = createSqliteDb();
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      ai_provider TEXT DEFAULT 'openai',
      openai_api_key TEXT DEFAULT '',
      anthropic_api_key TEXT DEFAULT '',
      preferred_model TEXT DEFAULT 'gpt-4o-mini',
      brand_name TEXT DEFAULT '',
      brand_tone TEXT DEFAULT 'clear, confident, technical',
      brand_primary_color TEXT DEFAULT '#101113',
      brand_rules TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  ensureSqliteColumn("ai_provider", "TEXT DEFAULT 'openai'");
  ensureSqliteColumn("openai_api_key", "TEXT DEFAULT ''");
  ensureSqliteColumn("anthropic_api_key", "TEXT DEFAULT ''");
  ensureSqliteColumn("preferred_model", "TEXT DEFAULT 'gpt-4o-mini'");
  ensureSqliteColumn("brand_name", "TEXT DEFAULT ''");
  ensureSqliteColumn("brand_tone", "TEXT DEFAULT 'clear, confident, technical'");
  ensureSqliteColumn("brand_primary_color", "TEXT DEFAULT '#101113'");
  ensureSqliteColumn("brand_rules", "TEXT DEFAULT ''");
}

async function createUser({ fullName, company, email, password }) {
  const salt = crypto.randomBytes(16).toString("hex");
  const createdAt = new Date().toISOString();
  const passwordHash = hashPassword(password, salt);

  if (usePostgres) {
    const result = await pool.query(
      `
        INSERT INTO users (full_name, company, email, password_hash, password_salt, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [fullName, company, email, passwordHash, salt, createdAt]
    );
    return result.rows[0];
  }

  const result = sqliteDb
    .prepare(`
      INSERT INTO users (full_name, company, email, password_hash, password_salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(fullName, company, email, passwordHash, salt, createdAt);

  return getUserById(result.lastInsertRowid);
}

async function getUserByEmail(email) {
  if (usePostgres) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
    return result.rows[0] || null;
  }

  return sqliteDb.prepare("SELECT * FROM users WHERE email = ?").get(email) || null;
}

async function getUserById(id) {
  if (usePostgres) {
    const result = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] || null;
  }

  return sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

async function verifyUser(email, password) {
  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  return hashPassword(password, user.password_salt) === user.password_hash ? user : null;
}

async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  const createdAt = new Date().toISOString();

  if (usePostgres) {
    await pool.query(
      "INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)",
      [token, userId, createdAt]
    );
    return token;
  }

  sqliteDb
    .prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)")
    .run(token, userId, createdAt);
  return token;
}

async function deleteSession(token) {
  if (usePostgres) {
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
    return;
  }

  sqliteDb.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

async function getUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  if (usePostgres) {
    const result = await pool.query(
      `
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = $1
        LIMIT 1
      `,
      [token]
    );
    return result.rows[0] || null;
  }

  return (
    sqliteDb
      .prepare(`
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
      `)
      .get(token) || null
  );
}

async function updateUserSettings(userId, settings) {
  const existingUser = await getUserById(userId);
  const aiProvider = settings.aiProvider === "anthropic" ? "anthropic" : "openai";
  const openaiApiKey =
    typeof settings.openaiApiKey === "string" && settings.openaiApiKey.trim()
      ? settings.openaiApiKey.trim()
      : existingUser.openai_api_key || "";
  const anthropicApiKey =
    typeof settings.anthropicApiKey === "string" && settings.anthropicApiKey.trim()
      ? settings.anthropicApiKey.trim()
      : existingUser.anthropic_api_key || "";

  const values = [
    aiProvider,
    openaiApiKey,
    anthropicApiKey,
    settings.preferredModel || existingUser.preferred_model || "gpt-4o-mini",
    settings.brandName || existingUser.brand_name || "",
    settings.brandTone || existingUser.brand_tone || "clear, confident, technical",
    settings.brandPrimaryColor || existingUser.brand_primary_color || "#101113",
    settings.brandRules || existingUser.brand_rules || "",
    userId
  ];

  if (usePostgres) {
    const result = await pool.query(
      `
        UPDATE users
        SET
          ai_provider = $1,
          openai_api_key = $2,
          anthropic_api_key = $3,
          preferred_model = $4,
          brand_name = $5,
          brand_tone = $6,
          brand_primary_color = $7,
          brand_rules = $8
        WHERE id = $9
        RETURNING *
      `,
      values
    );
    return result.rows[0] || null;
  }

  sqliteDb.prepare(`
    UPDATE users
    SET
      ai_provider = ?,
      openai_api_key = ?,
      anthropic_api_key = ?,
      preferred_model = ?,
      brand_name = ?,
      brand_tone = ?,
      brand_primary_color = ?,
      brand_rules = ?
    WHERE id = ?
  `).run(...values);

  return getUserById(userId);
}

module.exports = {
  initializeDatabase,
  publicUser,
  createUser,
  getUserByEmail,
  getUserById,
  verifyUser,
  createSession,
  deleteSession,
  getUserBySessionToken,
  updateUserSettings
};
