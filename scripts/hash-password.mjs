// Genera el hash bcrypt de una contraseña para el super-admin.
// Uso:  npm run hash -- "TuContraseñaSegura"
import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run hash -- "TuContraseñaSegura"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log("\nCopia esta línea en tu .env.local:\n");
console.log(`ADMIN_PASSWORD_HASH="${hash}"\n`);
