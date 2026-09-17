const {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} = require('@solana/web3.js');
require('dotenv').config();

const connection = new Connection(process.env.SOLANA_RPC, 'confirmed');

function generateWallet() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toString(),
    secretKey: Array.from(keypair.secretKey), // store as array, reconstruct later
  };
}

async function getBalance(publicKeyStr) {
  const pubkey = new PublicKey(publicKeyStr);
  const lamports = await connection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

async function withdraw(secretKeyArray, toAddress, amountSol) {
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
  const toPubkey = new PublicKey(toAddress);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    })
  );

  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
  return sig;
}

module.exports = { connection, generateWallet, getBalance, withdraw };
