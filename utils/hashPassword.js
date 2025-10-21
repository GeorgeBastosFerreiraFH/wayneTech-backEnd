import bcrypt from "bcryptjs" 

// Script para gerar hash de senhas
// Execute: node backend/utils/hashPassword.js

const senhas = [
  { usuario: "Bruce Wayne", senha: "wayne123" },
  { usuario: "Alfred Pennyworth", senha: "wayne123" },
  { usuario: "Lucius Fox", senha: "wayne123" },
  { usuario: "Barbara Gordon", senha: "wayne123" },
  { usuario: "Dick Grayson", senha: "wayne123" },
]

async function gerarHashes() {
  console.log("Gerando hashes de senhas...\n")

  for (const item of senhas) {
    const hash = await bcrypt.hash(item.senha, 10)
    console.log(`${item.usuario}:`)
    console.log(`  Senha: ${item.senha}`)
    console.log(`  Hash: ${hash}\n`)
  }
}

gerarHashes()
