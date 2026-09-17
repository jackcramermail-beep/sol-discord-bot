const Database = require('better-sqlite3');
const CryptoJS = require('crypto-js');
require('dotenv').config();

const db = new Database('wallets.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    discord_id TEXT PRIMARY KEY,
    public_key TEXT NOT NULL,
    encrypted_secret TEXT NOT NULL
  )
`);

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, process.env.ENCRYPTION_KEY).toString();
}

function decrypt(cipher) {
  const bytes = CryptoJS.AES.decrypt(cipher, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

function getWallet(discordId) {
  return db.prepare('SELECT * FROM wallets WHERE discord_id = ?').get(discordId);
}

function saveWallet(discordId, publicKey, secretKeyArray) {
  const encrypted = encrypt(JSON.stringify(secretKeyArray));
  db.prepare('INSERT INTO wallets (discord_id, public_key, encrypted_secret) VALUES (?, ?, ?)')
    .run(discordId, publicKey, encrypted);
}

module.exports = { getWallet, saveWallet, decrypt };
