import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import idl from './idl.json';

// Program ID from environment or fallback
const programId = process.env.REACT_APP_PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg7u31bQz5wA';

// Get the RPC endpoint based on network
const getEndpoint = () => {
  const network = process.env.REACT_APP_SOLANA_NETWORK || 'devnet';
  switch (network) {
    case 'mainnet':
      return 'https://api.mainnet-beta.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'devnet':
    default:
      return 'https://api.devnet.solana.com';
  }
};

// Initialize connection
export const getConnection = () => {
  return new Connection(getEndpoint(), 'confirmed');
};

// Initialize Anchor program
export const getProgram = (wallet) => {
  const connection = getConnection();
  const provider = new AnchorProvider(
    connection,
    wallet,
    { preflightCommitment: 'confirmed' }
  );
  
  return new Program(idl, new PublicKey(programId), provider);
};

// Upload a video to the blockchain
export const uploadVideo = async (wallet, title, description, cid, price, category) => {
  try {
    const program = getProgram(wallet);
    
    // Generate a new keypair for the video account
    const videoKeypair = web3.Keypair.generate();
    
    // Find platform account
    const [platformPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('platform')],
      program.programId
    );
    
    // Convert price to lamports (assuming price is in SOL)
    const priceInLamports = new BN(price * web3.LAMPORTS_PER_SOL);
    
    // Upload video
    const tx = await program.methods
      .uploadVideo(
        title,
        description,
        cid,
        priceInLamports,
        category
      )
      .accounts({
        video: videoKeypair.publicKey,
        platform: platformPDA,
        uploader: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([videoKeypair])
      .rpc();
    
    return {
      tx,
      videoPubkey: videoKeypair.publicKey.toString()
    };
  } catch (error) {
    console.error('Error uploading video to blockchain:', error);
    throw error;
  }
};

// Pay to watch a video
export const payToWatch = async (wallet, videoPubkey, uploaderPubkey, price) => {
  try {
    const program = getProgram(wallet);
    const connection = getConnection();
    
    // Convert string pubkeys to PublicKey objects
    const videoPublicKey = new PublicKey(videoPubkey);
    const uploaderPublicKey = new PublicKey(uploaderPubkey);
    
    // Find platform account
    const [platformPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('platform')],
      program.programId
    );
    
    // Find access account PDA
    const [accessPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('access'), videoPublicKey.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // Get token accounts
    const viewerTokenAccount = await getAssociatedTokenAddress(
      new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL mint
      wallet.publicKey
    );
    
    const uploaderTokenAccount = await getAssociatedTokenAddress(
      new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL mint
      uploaderPublicKey
    );
    
    const platformTokenAccount = await getAssociatedTokenAddress(
      new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL mint
      platformPDA
    );
    
    // Check if token accounts exist and create if needed
    const transaction = new Transaction();
    
    // Check if uploader token account exists
    const uploaderTokenAccountInfo = await connection.getAccountInfo(uploaderTokenAccount);
    if (!uploaderTokenAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          uploaderTokenAccount,
          uploaderPublicKey,
          new PublicKey('So11111111111111111111111111111111111111112')
        )
      );
    }
    
    // Check if platform token account exists
    const platformTokenAccountInfo = await connection.getAccountInfo(platformTokenAccount);
    if (!platformTokenAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          platformTokenAccount,
          platformPDA,
          new PublicKey('So11111111111111111111111111111111111111112')
        )
      );
    }
    
    // Add pay to watch instruction
    transaction.add(
      await program.methods
        .payToWatch()
        .accounts({
          video: videoPublicKey,
          platform: platformPDA,
          viewer: wallet.publicKey,
          access: accessPDA,
          viewerTokenAccount,
          uploaderTokenAccount,
          platformTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
    
    // Send transaction
    const signature = await wallet.sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature, 'confirmed');
    
    return {
      signature,
      accessPubkey: accessPDA.toString()
    };
  } catch (error) {
    console.error('Error paying to watch video:', error);
    throw error;
  }
};

// Update video details
export const updateVideo = async (wallet, videoPubkey, updates) => {
  try {
    const program = getProgram(wallet);
    
    // Convert string pubkey to PublicKey object
    const videoPublicKey = new PublicKey(videoPubkey);
    
    // Extract update fields
    const { title, description, price, category } = updates;
    
    // Convert price to lamports if provided
    let priceInLamports = null;
    if (price !== undefined) {
      priceInLamports = new BN(price * web3.LAMPORTS_PER_SOL);
    }
    
    // Update video
    const tx = await program.methods
      .updateVideo(
        title || null,
        description || null,
        priceInLamports,
        category || null
      )
      .accounts({
        video: videoPublicKey,
        uploader: wallet.publicKey
      })
      .rpc();
    
    return { tx };
  } catch (error) {
    console.error('Error updating video on blockchain:', error);
    throw error;
  }
}; 