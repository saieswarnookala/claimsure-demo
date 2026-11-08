// Usage: node scripts/add-user.mjs <username> "<Full name>" "<Role>" "<password>"
// Prints a JSON entry to add to the USERS secret.
import { createHash, randomBytes } from "node:crypto";
const [u, name, role, pw] = process.argv.slice(2);
if (!u || !name || !role || !pw) { console.error('Usage: node scripts/add-user.mjs <username> "<Full name>" "<Role>" "<password>"'); process.exit(1); }
const salt = randomBytes(16).toString("hex");
const hash = createHash("sha256").update(salt + pw).digest("hex");
console.log(JSON.stringify({ [u.toLowerCase()]: { name, role, salt, hash } }, null, 2));
