-- Dados iniciais para o sistema WayneTech

-- Inserir usuários (senhas: todos usam "wayne123" como senha)
-- Senha hash gerada com bcrypt para "wayne123": $2b$10$rQZ9vXJ5kZJ5X5X5X5X5XeO5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X
INSERT INTO usuarios (nome, email, senha_hash, nivel_acesso) VALUES
  ('Bruce Wayne', 'bruce@waynetech.com', '$2b$10$YourHashHere', 'admin'),
  ('Alfred Pennyworth', 'alfred@waynetech.com', '$2b$10$YourHashHere', 'admin'),
  ('Lucius Fox', 'lucius@waynetech.com', '$2b$10$YourHashHere', 'gerente'),
  ('Barbara Gordon', 'barbara@waynetech.com', '$2b$10$YourHashHere', 'gerente'),
  ('Dick Grayson', 'dick@waynetech.com', '$2b$10$YourHashHere', 'funcionario')
ON CONFLICT (email) DO NOTHING;

-- Inserir itens do inventário
INSERT INTO inventario (nome, categoria, status, localizacao, modelo_3d, thumbnail, especificacoes) VALUES
    -- Linha 1
    ('Batmóvel', 'Veículo Tático', 'Disponível', 'Garagem Principal', '/modelos3d/batmobile.glb', '/thumbnails/batmobile.png', '{"tecnologia": "Wayne", "velocidade_maxima": "350 km/h", "blindagem": "Nível 10"}'),
    ('Bat-wing', 'Veículo Aéreo', 'Disponível', 'Hangar Aéreo', '/modelos3d/3d_batwing_batman_planespacecraft.glb', '/thumbnails/batwing.png', '{"uso": "Combate e reconhecimento", "velocidade_maxima": "Mach 3", "autonomia": "5000km"}'),
    ('Armadura do Batman', 'Equipamento', 'Em Uso', 'Armário de Trajes', '/modelos3d/batman_suit.glb', '/thumbnails/batman-suit.png', '{"tecnologia": "Avançada Wayne", "status": "Em Uso"}'),
    ('Batarangue', 'Gadget', 'Disponível', 'Arsenal de Gadgets', '/modelos3d/dc_batman_batarang.glb', '/thumbnails/batarang.png', '{"uso": "Arremesso multifuncional", "material": "Titânio", "alcance": "50m"}'),

    -- Linha 2
    ('Console de Computador Grande', 'Infraestrutura', 'Disponível', 'Batcaverna - Principal', '/modelos3d/large-wall-mounted_computer_console.glb', '/thumbnails/console-large.png', '{"sistema": "Computação principal", "telas": "Múltiplas", "ia": "Alfred AI"}'),
    ('Console de Computador Pequeno', 'Infraestrutura', 'Disponível', 'Batcaverna - Secundário', '/modelos3d/wall_computer_-_small.glb', '/thumbnails/console-small.png', '{"sistema": "Terminal de acesso secundário", "telas": "4"}'),
    ('Drone de Segurança', 'Segurança', 'Disponível', 'Torre de Controle', '/modelos3d/security_drone.glb', '/thumbnails/security-drone.png', '{"tipo": "Autônomo", "monitoramento": "Perimetral", "qtd": "2"}'),
    ('Drone Terrestre', 'Segurança', 'Disponível', 'Garagem - Drones', '/modelos3d/police_drone.glb', '/thumbnails/police-drone.png', '{"tipo": "Patrulha", "câmeras": "Alta resolução", "qtd": "2"}'),

    -- Linha 3 (continuação)
    ('Drone Espião', 'Segurança', 'Disponível', 'Torre de Controle', '/modelos3d/drone.glb', '/thumbnails/drone.png', '{"tipo": "Multifuncional", "operações": "Diversas"}'),
    ('Armadilha Sci-Fi', 'Segurança', 'Disponível', 'Laboratório', '/modelos3d/sci_fi_trap_game_ready.glb', '/thumbnails/trap.png', '{"tipo": "Sistema de contenção avançado", "qtd": "8"}')
ON CONFLICT DO NOTHING;

-- Inserir câmeras
INSERT INTO cameras (nome, localizacao, status, url_stream) VALUES
  ('Entrada Principal', 'Portão Norte', 'online', '/cam-1.gif'),
  ('Estacionamento', 'Garagem Subterrânea', 'online', '/cam-1.gif'),
  ('Laboratório', 'Ala Científica', 'online', '/cam-1.gif'),
  ('Perímetro Norte', 'Cerca Externa', 'offline', '/cam-1.gif')
ON CONFLICT DO NOTHING;

-- Inserir alertas
INSERT INTO alertas (tipo, mensagem, nivel, resolvido) VALUES
  ('Segurança', 'Movimento detectado no perímetro norte', 'alto', false),
  ('Sistema', 'Atualização de firmware disponível', 'baixo', false),
  ('Manutenção', 'Batmóvel Tumbler requer manutenção preventiva', 'medio', false),
  ('Segurança', 'Tentativa de acesso não autorizado bloqueada', 'critico', true)
ON CONFLICT DO NOTHING;


-- Script para adicionar coluna nivel_minimo na tabela inventario
-- Este script adiciona controle de acesso baseado em níveis de usuário

-- Adicionar coluna nivel_minimo
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS nivel_minimo VARCHAR(20) DEFAULT 'funcionario';

-- Atualizar itens existentes com base nos dados mockados
-- Admin items (Batmóvel, Bat-Wing, Armadura, Batarangue)
UPDATE inventario 
SET nivel_minimo = 'admin' 
WHERE nome IN ('Batmóvel', 'Bat-wing', 'Armadura do Batman', 'Batarangue');

-- Gerente items (Consoles, Drones de Segurança, Armadilha)
UPDATE inventario 
SET nivel_minimo = 'gerente' 
WHERE nome IN (
  'Console de Computador Grande', 
  'Console de Computador Pequeno', 
  'Drone de Segurança', 
  'Drone Terrestre',
  'Armadilha Sci-Fi'
);

-- Funcionario items (Drone Espião)
UPDATE inventario 
SET nivel_minimo = 'funcionario' 
WHERE nome = 'Drone Espião';

-- Verificar as mudanças
SELECT id, nome, categoria, nivel_minimo 
FROM inventario 
ORDER BY nivel_minimo DESC, nome;
