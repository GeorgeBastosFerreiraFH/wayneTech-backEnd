# **WayneTech Security \- Backend API**

Esta é a API backend para o sistema de segurança da WayneTech. Ela é responsável por gerenciar a autenticação de usuários, controlar o acesso baseado em níveis de permissão e fornecer operações CRUD (Criar, Ler, Atualizar, Deletar) para o inventário de equipamentos.

## **✨ Features**

* **Autenticação com JWT:** Sistema seguro de login que gera um JSON Web Token (JWT) para autenticar as requisições.  
* **Controle de Acesso Baseado em Nível (RBAC):** As rotas e os dados são protegidos de acordo com o nível do usuário (funcionario, gerente, admin).  
* **Hashing de Senhas:** As senhas dos usuários são armazenadas de forma segura usando o algoritmo bcryptjs.  
* **API RESTful:** Endpoints bem definidos para interagir com os recursos de inventário.  
* **Configuração de CORS:** Permite o acesso seguro do frontend hospedado em diferentes ambientes (desenvolvimento e produção).

## **🚀 Tecnologias Utilizadas**

* **Runtime:** [Node.js](https://nodejs.org/) (versão 22.x)  
* **Framework:** [Express.js](https://expressjs.com/pt-br/)  
* **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) (conectado via pg)  
* **Autenticação:** [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) & [bcryptjs](https://www.google.com/search?q=https://github.com/dcodeIO/bcrypt.js)  
* **Gerenciamento de CORS:** [cors](https://github.com/expressjs/cors)  
* **Variáveis de Ambiente:** [dotenv](https://github.com/motdotla/dotenv)

## **🔧 Configuração do Ambiente**

Para rodar este projeto localmente, você precisará configurar as seguintes variáveis de ambiente em um arquivo .env na raiz do projeto.

Crie um arquivo chamado .env e adicione as seguintes chaves:

\# String de conexão completa para o seu banco de dados PostgreSQL  
DATABASE\_URL="postgresql://USUARIO:SENHA@HOST:PORTA/DATABASE?sslmode=require"

\# Chave secreta para assinar os tokens JWT. Use um valor longo e aleatório.  
JWT\_SECRET="SUA\_CHAVE\_SECRETA\_SUPER\_SEGURA"

\# URL do frontend para a configuração do CORS  
FRONTEND\_URL="http://localhost:5173"

## **⚙️ Rodando o Projeto Localmente**

1. **Clone o repositório:**  
   git clone \<URL\_DO\_SEU\_REPOSITORIO\>  
   cd \<NOME\_DA\_PASTA\_DO\_PROJETO\>

2. **Instale as dependências:**  
   npm install

3. **Crie e configure o arquivo .env** conforme a seção anterior.  
4. **Inicie o servidor em modo de desenvolvimento:**  
   npm run dev

O servidor estará rodando em http://localhost:3000 (ou na porta definida pela sua variável de ambiente PORT).

## **Endpoints da API**

Todas as rotas, exceto /api/auth/login, / e /api/health, são protegidas e exigem um token JWT válido no cabeçalho Authorization.

### **Autenticação**

* POST /api/auth/login  
  * **Descrição:** Autentica um usuário e retorna um token JWT e os dados do usuário.  
  * **Body:** { "email": "user@example.com", "senha": "password123" }  
* GET /api/auth/verificar  
  * **Descrição:** Verifica a validade do token JWT e retorna os dados atualizados do usuário.  
  * **Protegida:** Sim

### **Inventário**

* GET /api/inventario  
  * **Descrição:** Retorna a lista de itens do inventário de acordo com o nível de acesso do usuário.  
  * **Protegida:** Sim  
* POST /api/inventario  
  * **Descrição:** Adiciona um novo item ao inventário.  
  * **Protegida:** Sim  
  * **Body:** { "nome": "...", "categoria": "...", ... }  
* PUT /api/inventario/:id  
  * **Descrição:** Atualiza um item existente no inventário.  
  * **Protegida:** Sim  
  * **Body:** { "nome": "...", "categoria": "...", ... }  
* DELETE /api/inventario/:id  
  * **Descrição:** Deleta um item do inventário.  
  * **Protegida:** Sim

### **Status**

* GET /  
  * **Descrição:** Rota principal que exibe o status da API.  
* GET /api/health  
  * **Descrição:** Rota de "health check" para monitoramento.

## **🚀 Deploy**

O backend está hospedado na [Vercel](https://vercel.com/) e conectado a um banco de dados PostgreSQL na [Neon.tech](https://neon.tech/).
