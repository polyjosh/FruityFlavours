// Sets the admin password: stores its argon2 hash (base64) as ADMIN_PASSWORD_HASH in .env.
// Usage: npm run admin:password -- "your new password"   (omit the password to generate one)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { randomBytes } from "crypto";
import { hash } from "@node-rs/argon2";

let password = process.argv[2];
let generated = false;
if (!password) {
  password = randomBytes(9).toString("base64url");
  generated = true;
}
if (password.length < 10) {
  console.error("Use at least 10 characters.");
  process.exit(1);
}
const value = Buffer.from(await hash(password)).toString("base64");
const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const line = `ADMIN_PASSWORD_HASH=${value}`;
writeFileSync(".env", /^ADMIN_PASSWORD_HASH=.*$/m.test(env) ? env.replace(/^ADMIN_PASSWORD_HASH=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
if (generated) {
  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/admin-password.txt", password + "\n");
  console.log("Generated a new admin password and saved it to .data/admin-password.txt (not committed).");
} else {
  console.log("Admin password updated.");
}
console.log("Restart the dev server to use it.");
