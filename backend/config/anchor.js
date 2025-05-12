const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@project-serum/anchor');
const fs = require('fs');
const path = require('path');
const idl = require('./idl.json');
const bs58 = require('bs58');
const decode = bs58.decode ? bs58.decode : bs58.default.decode;

// Load IDL from a local file
// const idl = JSON.parse(
//   fs.readFileSync(path.resolve(__dirname, './idl.json'), 'utf8')
// );

// Configure connection to Solana network
const network = process.env.SOLANA_NETWORK || 'devnet';
const connection = new Connection(
  network === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : network === 'testnet'
    ? 'https://api.testnet.solana.com'
    : 'https://api.devnet.solana.com',
  'confirmed'
);

// Configure wallet from private key or keypair
let wallet;

if (process.env.PAYER_PRIVATE_KEY) {
  let payerSecretKey;
  if (process.env.PAYER_PRIVATE_KEY.includes(',')) {
    // Array format
    payerSecretKey = Buffer.from(
      process.env.PAYER_PRIVATE_KEY.split(',').map(Number)
    );
  } else {
    // Base58 format
    payerSecretKey = decode(process.env.PAYER_PRIVATE_KEY);
  }
  const payerKeypair = Keypair.fromSecretKey(payerSecretKey);
  wallet = new Wallet(payerKeypair);
  console.log(`Wallet API connected successfully. Public key: ${payerKeypair.publicKey.toString()}`);
} else {
  // Generate a new keypair
  const payerKeypair = Keypair.generate();
  wallet = new Wallet(payerKeypair);
  console.warn(
    'WARNING: No wallet private key provided. Using generated keypair.'
  );
  console.warn(
    `Keypair public key: ${payerKeypair.publicKey.toString()}. Fund this address to use the API.`
  );
}

// Configure Anchor provider
const provider = new AnchorProvider(connection, wallet, {
  preflightCommitment: 'confirmed',
});

// Configure Anchor program
const programId = new PublicKey(
  process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg7u31bQz5wA'
);
const program = new Program(idl, programId, provider);

module.exports = {
  connection,
  wallet,
  provider,
  program,
  programId,
}; 