-- Criação do banco de dados WayneTech

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  nivel_acesso VARCHAR(50) NOT NULL CHECK (nivel_acesso IN ('funcionario', 'gerente', 'admin')),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de inventário
CREATE TABLE IF NOT EXISTS inventario (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'Operacional',
  localizacao VARCHAR(255),
  modelo_3d VARCHAR(500),
  thumbnail VARCHAR(500),
  especificacoes JSONB,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de câmeras
CREATE TABLE IF NOT EXISTS cameras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  localizacao VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'online',
  url_stream VARCHAR(500),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de alertas
CREATE TABLE IF NOT EXISTS alertas (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL,
  mensagem TEXT NOT NULL,
  nivel VARCHAR(50) NOT NULL CHECK (nivel IN ('baixo', 'medio', 'alto', 'critico')),
  resolvido BOOLEAN DEFAULT false,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolvido_em TIMESTAMP
);

-- Tabela de logs
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  acao VARCHAR(255) NOT NULL,
  detalhes JSONB,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_inventario_categoria ON inventario(categoria);
CREATE INDEX IF NOT EXISTS idx_cameras_status ON cameras(status);
CREATE INDEX IF NOT EXISTS idx_alertas_nivel ON alertas(nivel);
CREATE INDEX IF NOT EXISTS idx_alertas_resolvido ON alertas(resolvido);
CREATE INDEX IF NOT EXISTS idx_logs_usuario ON logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_criado_em ON logs(criado_em DESC);
