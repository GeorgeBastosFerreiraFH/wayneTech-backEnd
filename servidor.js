import express from "express"
import cors from "cors"
import pkg from "pg"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const { Pool } = pkg

const app = express()

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// Configuração de CORS para produção
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://waynetechsecurity.netlify.app", // URL do Netlify hardcoded
  process.env.FRONTEND_URL,
]

const corsOptions = {
  origin: (origin, callback) => {
    console.log("CORS - Origin recebida:", origin)
    console.log("CORS - Origens permitidas:", allowedOrigins)

    // Permite requisições sem origin (Postman, curl, etc)
    if (!origin) {
      console.log("CORS - Permitindo requisição sem origin")
      return callback(null, true)
    }

    // Verifica se a origin está na lista de permitidas
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log("CORS - Origin permitida:", origin)
      callback(null, true)
    } else {
      console.log("CORS - Origin bloqueada:", origin)
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
app.use(express.json())

// Middleware de verificação de token
const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (erro, usuario) => {
    if (erro) {
      return res.status(403).json({ erro: "Token inválido" })
    }
    req.usuario = usuario
    next()
  })
}

// Função para mapear nível de acesso para número
const obterNivelNumerico = (nivel) => {
  const niveis = {
    funcionario: 1,
    gerente: 2,
    admin: 3,
  }
  return niveis[nivel] || 0
}

// Rota de login
app.post("/api/auth/login", async (req, res) => {
  console.log("Login - Requisição recebida:", req.body.email)

  try {
    const { email, senha } = req.body

    const resultado = await pool.query("SELECT * FROM usuarios WHERE email = $1", [email])

    if (resultado.rows.length === 0) {
      console.log("Login - Usuário não encontrado:", email)
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const usuario = resultado.rows[0]
    const senhaValida = await bcrypt.compare(senha, usuario.senha)

    if (!senhaValida) {
      console.log("Login - Senha inválida para:", email)
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        nivel: usuario.nivel,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    )

    console.log("Login - Sucesso para:", email)

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
      },
    })
  } catch (erro) {
    console.error("Login - Erro:", erro)
    res.status(500).json({ erro: "Erro ao fazer login" })
  }
})

// Rota de verificação de token
app.get("/api/auth/verificar", verificarToken, async (req, res) => {
  console.log("Verificar - Token válido para:", req.usuario.email)

  try {
    const resultado = await pool.query("SELECT id, nome, email, nivel FROM usuarios WHERE id = $1", [req.usuario.id])

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    res.json({ usuario: resultado.rows[0] })
  } catch (erro) {
    console.error("Verificar - Erro:", erro)
    res.status(500).json({ erro: "Erro ao verificar token" })
  }
})

// Rota de inventário com filtragem por nível
app.get("/api/inventario", verificarToken, async (req, res) => {
  console.log("Inventário - Requisição de:", req.usuario.email, "Nível:", req.usuario.nivel)

  try {
    const nivelUsuario = obterNivelNumerico(req.usuario.nivel)

    const resultado = await pool.query(
      `SELECT * FROM inventario 
       WHERE COALESCE(
         CASE nivel_minimo 
           WHEN 'funcionario' THEN 1 
           WHEN 'gerente' THEN 2 
           WHEN 'admin' THEN 3 
           ELSE 1 
         END, 1
       ) <= $1 
       ORDER BY id`,
      [nivelUsuario],
    )

    console.log("Inventário - Retornando", resultado.rows.length, "itens")
    res.json(resultado.rows)
  } catch (erro) {
    console.error("Inventário - Erro:", erro)
    res.status(500).json({ erro: "Erro ao buscar inventário" })
  }
})

// Rota de adicionar item ao inventário
app.post("/api/inventario", verificarToken, async (req, res) => {
  console.log("Adicionar item - Requisição de:", req.usuario.email)

  try {
    const { nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo } = req.body

    const resultado = await pool.query(
      `INSERT INTO inventario 
       (nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [nome, categoria, status, localizacao, modelo_3d, thumbnail, JSON.stringify(especificacoes), nivel_minimo],
    )

    console.log("Adicionar item - Sucesso:", resultado.rows[0].id)
    res.status(201).json(resultado.rows[0])
  } catch (erro) {
    console.error("Adicionar item - Erro:", erro)
    res.status(500).json({ erro: "Erro ao adicionar item" })
  }
})

// Rota de atualizar item do inventário
app.put("/api/inventario/:id", verificarToken, async (req, res) => {
  console.log("Atualizar item - ID:", req.params.id)

  try {
    const { id } = req.params
    const { nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo } = req.body

    const resultado = await pool.query(
      `UPDATE inventario 
       SET nome = $1, categoria = $2, status = $3, localizacao = $4, 
           modelo_3d = $5, thumbnail = $6, especificacoes = $7, nivel_minimo = $8,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $9 
       RETURNING *`,
      [nome, categoria, status, localizacao, modelo_3d, thumbnail, JSON.stringify(especificacoes), nivel_minimo, id],
    )

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    console.log("Atualizar item - Sucesso:", id)
    res.json(resultado.rows[0])
  } catch (erro) {
    console.error("Atualizar item - Erro:", erro)
    res.status(500).json({ erro: "Erro ao atualizar item" })
  }
})

// Rota de deletar item do inventário
app.delete("/api/inventario/:id", verificarToken, async (req, res) => {
  console.log("Deletar item - ID:", req.params.id)

  try {
    const { id } = req.params

    const resultado = await pool.query("DELETE FROM inventario WHERE id = $1 RETURNING *", [id])

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    console.log("Deletar item - Sucesso:", id)
    res.json({ mensagem: "Item deletado com sucesso" })
  } catch (erro) {
    console.error("Deletar item - Erro:", erro)
    res.status(500).json({ erro: "Erro ao deletar item" })
  }
})

// Rota raiz para teste
app.get("/", (req, res) => {
  res.json({
    mensagem: "WayneTech Security API",
    status: "online",
    timestamp: new Date().toISOString(),
  })
})

// Rota de health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
})

export default app
