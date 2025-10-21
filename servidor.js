import express from "express"
import cors from "cors"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import { query, initDatabase } from "./database/connection.js"

dotenv.config()

const app = express()
const PORTA = process.env.PORT || 5000
const CHAVE_JWT = process.env.JWT_SECRET || "o_bruce_wayne_e_o_batman"

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true)

      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true)
      } else {
        console.log("[v0] Origem bloqueada pelo CORS:", origin)
        callback(new Error("Não permitido pelo CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json())

const niveisAcesso = {
  funcionario: 1,
  gerente: 2,
  admin: 3,
}

// Middleware de autenticação
const verificarToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido" })
  }

  try {
    const decoded = jwt.verify(token, CHAVE_JWT)
    req.usuario = decoded
    next()
  } catch (erro) {
    return res.status(401).json({ erro: "Token inválido" })
  }
}

// Middleware de verificação de nível de acesso
const verificarNivel = (nivelMinimo) => {
  return (req, res, next) => {
    const nivelUsuario = niveisAcesso[req.usuario.nivel] || 0
    const nivelRequerido = niveisAcesso[nivelMinimo] || 0

    if (nivelUsuario < nivelRequerido) {
      return res.status(403).json({ erro: "Acesso negado" })
    }

    next()
  }
}

// Rotas de autenticação
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body

    const resultado = await query("SELECT * FROM usuarios WHERE email = $1", [email])

    if (resultado.rows.length === 0) {
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const usuario = resultado.rows[0]
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)

    if (!senhaValida) {
      return res.status(401).json({ erro: "Credenciais inválidas" })
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email, nivel: usuario.nivel_acesso }, CHAVE_JWT, {
      expiresIn: "24h",
    })

    await query("INSERT INTO logs (usuario_id, acao, detalhes) VALUES ($1, $2, $3)", [
      usuario.id,
      "login",
      JSON.stringify({ email: usuario.email, ip: req.ip }),
    ])

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel_acesso,
      },
    })
  } catch (erro) {
    console.error("[v0] Erro no login:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/auth/verificar", verificarToken, async (req, res) => {
  try {
    const resultado = await query("SELECT id, nome, email, nivel_acesso FROM usuarios WHERE id = $1", [req.usuario.id])

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" })
    }

    res.json({ usuario: resultado.rows[0] })
  } catch (erro) {
    console.error("[v0] Erro ao verificar token:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/inventario", verificarToken, async (req, res) => {
  try {
    // Buscar todos os itens do inventário
    const resultado = await query("SELECT * FROM inventario ORDER BY criado_em DESC")

    // Obter nível do usuário
    const nivelUsuario = niveisAcesso[req.usuario.nivel] || 0

    // Filtrar itens baseado no nível de acesso
    const itensFiltrados = resultado.rows.filter((item) => {
      const nivelItem = niveisAcesso[item.nivel_minimo] || 1
      return nivelUsuario >= nivelItem
    })

    console.log(
      `[v0] Inventário filtrado: ${itensFiltrados.length}/${resultado.rows.length} itens para usuário nível ${req.usuario.nivel}`,
    )

    res.json(itensFiltrados)
  } catch (erro) {
    console.error("[v0] Erro ao buscar inventário:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.post("/api/inventario", verificarToken, verificarNivel("admin"), async (req, res) => {
  try {
    const { nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo } = req.body

    const resultado = await query(
      `INSERT INTO inventario (nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        nome,
        categoria,
        status,
        localizacao,
        modelo_3d,
        thumbnail,
        JSON.stringify(especificacoes),
        nivel_minimo || "funcionario",
      ],
    )

    await query("INSERT INTO logs (usuario_id, acao, detalhes) VALUES ($1, $2, $3)", [
      req.usuario.id,
      "adicionar_item",
      JSON.stringify({ item: nome, nivel_minimo }),
    ])

    res.status(201).json(resultado.rows[0])
  } catch (erro) {
    console.error("[v0] Erro ao adicionar item:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.put("/api/inventario/:id", verificarToken, verificarNivel("admin"), async (req, res) => {
  try {
    const { id } = req.params
    const { nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes, nivel_minimo } = req.body

    const resultado = await query(
      `UPDATE inventario 
       SET nome = $1, categoria = $2, status = $3, localizacao = $4, 
           modelo_3d = $5, thumbnail = $6, especificacoes = $7, nivel_minimo = $8, atualizado_em = NOW()
       WHERE id = $9 RETURNING *`,
      [
        nome,
        categoria,
        status,
        localizacao,
        modelo_3d,
        thumbnail,
        JSON.stringify(especificacoes),
        nivel_minimo || "funcionario",
        id,
      ],
    )

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    await query("INSERT INTO logs (usuario_id, acao, detalhes) VALUES ($1, $2, $3)", [
      req.usuario.id,
      "atualizar_item",
      JSON.stringify({ item_id: id, nome, nivel_minimo }),
    ])

    res.json(resultado.rows[0])
  } catch (erro) {
    console.error("[v0] Erro ao atualizar item:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.delete("/api/inventario/:id", verificarToken, verificarNivel("admin"), async (req, res) => {
  try {
    const { id } = req.params

    const resultado = await query("DELETE FROM inventario WHERE id = $1 RETURNING nome", [id])

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Item não encontrado" })
    }

    await query("INSERT INTO logs (usuario_id, acao, detalhes) VALUES ($1, $2, $3)", [
      req.usuario.id,
      "remover_item",
      JSON.stringify({ item_id: id, nome: resultado.rows[0].nome }),
    ])

    res.json({ mensagem: "Item removido com sucesso" })
  } catch (erro) {
    console.error("[v0] Erro ao remover item:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/dashboard/estatisticas", verificarToken, async (req, res) => {
  try {
    const [inventario, cameras, alertas] = await Promise.all([
      query("SELECT COUNT(*) as total, status FROM inventario GROUP BY status"),
      query("SELECT COUNT(*) as total, status FROM cameras GROUP BY status"),
      query("SELECT COUNT(*) as total, nivel FROM alertas WHERE resolvido = false GROUP BY nivel"),
    ])

    res.json({
      inventario: inventario.rows,
      cameras: cameras.rows,
      alertas: alertas.rows,
    })
  } catch (erro) {
    console.error("[v0] Erro ao buscar estatísticas:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/monitoramento/cameras", verificarToken, verificarNivel("gerente"), async (req, res) => {
  try {
    const resultado = await query("SELECT * FROM cameras ORDER BY id")
    res.json(resultado.rows)
  } catch (erro) {
    console.error("[v0] Erro ao buscar câmeras:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/monitoramento/alertas", verificarToken, verificarNivel("gerente"), async (req, res) => {
  try {
    const resultado = await query("SELECT * FROM alertas ORDER BY criado_em DESC LIMIT 10")
    res.json(resultado.rows)
  } catch (erro) {
    console.error("[v0] Erro ao buscar alertas:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/logs", verificarToken, verificarNivel("admin"), async (req, res) => {
  try {
    const resultado = await query(
      `SELECT l.*, u.nome as usuario_nome 
       FROM logs l 
       LEFT JOIN usuarios u ON l.usuario_id = u.id 
       ORDER BY l.criado_em DESC 
       LIMIT 50`,
    )
    res.json(resultado.rows)
  } catch (erro) {
    console.error("[v0] Erro ao buscar logs:", erro)
    res.status(500).json({ erro: "Erro no servidor" })
  }
})

app.get("/api/health", (req, res) => {
  res.json({ status: "online", timestamp: new Date().toISOString() })
})

// Iniciar servidor
initDatabase()
  .then(() => {
    app.listen(PORTA, () => {
      console.log(`🦇 Servidor WayneTech rodando na porta ${PORTA}`)
    })
  })
  .catch((erro) => {
    console.error("[v0] Erro ao inicializar banco de dados:", erro)
    process.exit(1)
  })
