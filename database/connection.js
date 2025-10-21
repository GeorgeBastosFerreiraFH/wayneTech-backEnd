import dotenv from "dotenv"
dotenv.config()

import pkg from "pg";
const { Pool } = pkg;

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Teste de conexão
pool.on("connect", () => {
  console.log("[v0] Conectado ao banco de dados PostgreSQL");
});

pool.on("error", (err) => {
  console.error("[v0] Erro inesperado no pool de conexões:", err);
  process.exit(-1);
});

// Função helper para executar queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("[v0] Query executada", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("[v0] Erro na query:", { text, error: error.message });
    throw error;
  }
};

// Função para inicializar o banco de dados
export const initDatabase = async () => {
  try {
    console.log("[v0] Verificando conexão com o banco de dados...");
    await pool.query("SELECT NOW()");
    console.log("[v0] Banco de dados conectado com sucesso!");
  } catch (error) {
    console.error("[v0] Erro ao conectar ao banco de dados:", error);
    throw error;
  }
};
