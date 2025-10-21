import express from "express"
import cors from "cors"
import { neon } from "@neondatabase/serverless"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const app = express()

const sql = neon(process.env.DATABASE_URL)

// Configuração de CORS para produção
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://waynetechsecurity.netlify.app",
  process.env.FRONTEND_URL,
].filter(Boolean) // Remove valores undefined

const corsOptions = {
  origin: (origin, callback) => {
    console.log("CORS - Origin recebida:", origin)
    console.log("CORS - Origens permitidas:", allowedOrigins)

    if (!origin) {
      console.log("CORS - Permitindo requisição sem origin")
      return callback(null, true)
    }

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

    const resultado = await sql`SELECT * FROM usuarios WHERE email = ${email}`

    if (resultado.length === 0) {
      console.log("Login - Usuário não encontrado:", email)
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const usuario = resultado[0]
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
    res.status(500).json({ erro: "Erro ao fazer login", detalhes: erro.message })
  }
})

// Rota de verificação de token
app.get("/api/auth/verificar", verificarToken, async (req, res) => {
  console.log("Verificar - Token válido para:", req.usuario.email)

  try {
    const resultado = await sql`SELECT id, nome, email, nivel FROM usuarios WHERE id = ${req.usuario.id}`

    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    res.json({ usuario: resultado[0] })
  } catch (erro) {
    console.error("Verificar - Erro:", erro)
    res.status(500).json({ erro: "Erro ao verificar token", detalhes: erro.message })
  }
})

// Rota de inventário com filtragem por nível
app.get("/api/inventario", verificarToken, async (req, res) => {
  console.log("Inventário - Requisição de:", req.usuario.email, "Nível:", req.usuario.nivel)

  try {
    const nivelUsuario = obterNivelNumerico(req.usuario.nivel)

    const resultado = await sql`
      SELECT * FROM inventario 
      WHERE COALESCE(
        CASE nivel_minimo 
          WHEN 'funcionario' THEN 1 
          WHEN 'gerente' THEN 2 
          WHEN 'admin' THEN 3 
          ELSE 1 
        END, 1
      ) <= ${nivelUsuario}
      ORDER BY id
    `

    console.log("Inventário - Retornando", resultado.length, "itens")
    res.json(resultado)
  } catch (erro) {
    console.error("Inventário - Erro:", erro)
    res.status(500).json({ erro: "Erro ao buscar inventário", detalhes: erro.message })
  }
})

// Rota de adicionar item ao inventário
app.post("/api/inventario", verificarToken, async (req, res) => {
  console.log("Adicionar item - Requisição de:", req.usuario.email)

  try {
    const { nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo } = req.body

    const resultado = await sql`
      INSERT INTO inventario 
      (nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo) 
      VALUES (${nome}, ${categoria}, ${status}, ${localizacao}, ${modelo_3d}, ${thumbnail}, ${JSON.stringify(especificacoes)}, ${nivel_minimo})
      RETURNING *
    `

    console.log("Adicionar item - Sucesso:", resultado[0].id)
    res.status(201).json(resultado[0])
  } catch (erro) {
    console.error("Adicionar item - Erro:", erro)
    res.status(500).json({ erro: "Erro ao adicionar item", detalhes: erro.message })
  }
})

// Rota de atualizar item do inventário
app.put("/api/inventario/:id", verificarToken, async (req, res) => {
  console.log("Atualizar item - ID:", req.params.id)

  try {
    const { id } = req.params
    const { nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo } = req.body

    const resultado = await sql`
      UPDATE inventario 
      SET nome = ${nome}, categoria = ${categoria}, status = ${status}, localizacao = ${localizacao},
          modelo_3d = ${modelo_3d}, thumbnail = ${thumbnail}, especificacoes = ${JSON.stringify(especificacoes)}, 
          nivel_minimo = ${nivel_minimo}, atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    console.log("Atualizar item - Sucesso:", id)
    res.json(resultado[0])
  } catch (erro) {
    console.error("Atualizar item - Erro:", erro)
    res.status(500).json({ erro: "Erro ao atualizar item", detalhes: erro.message })
  }
})

// Rota de deletar item do inventário
app.delete("/api/inventario/:id", verificarToken, async (req, res) => {
  console.log("Deletar item - ID:", req.params.id)

  try {
    const { id } = req.params

    const resultado = await sql`DELETE FROM inventario WHERE id = ${id} RETURNING *`

    if (resultado.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    console.log("Deletar item - Sucesso:", id)
    res.json({ mensagem: "Item deletado com sucesso" })
  } catch (erro) {
    console.error("Deletar item - Erro:", erro)
    res.status(500).json({ erro: "Erro ao deletar item", detalhes: erro.message })
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
app.get("/api/health", async (req, res) => {
  try {
    await sql`SELECT 1`
    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    })
  } catch (erro) {
    console.error("Health check - Erro no banco:", erro)
    res.status(500).json({
      status: "error",
      database: "disconnected",
      erro: erro.message,
      timestamp: new Date().toISOString(),
    })
  }
})

export default app
