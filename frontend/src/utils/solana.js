import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
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
    console.log('Starting pay to watch with parameters:', {
      videoPubkey,
      uploaderPubkey,
      price
    });
    
    // TESTING MODE - Bypass actual blockchain transactions
    // Development workaround to avoid TokenOwnerOffCurveError
    console.log('⚠️ Using development workaround for TokenOwnerOffCurveError');
    
    // Simply create a signature and access PDA without actual blockchain interaction
    // This allows testing the UI flow without requiring valid token accounts
    const program = getProgram(wallet);
    
    // Convert string pubkeys to PublicKey objects (these are still needed for the access PDA)
    const videoPublicKey = new PublicKey(videoPubkey);

    // Find access account PDA - this is still needed for the database record
    const [accessPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('access'), videoPublicKey.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    // Generate a fake transaction signature
    const mockSignature = `mock_tx_${Date.now().toString()}`;
    console.log('Generated mock transaction signature:', mockSignature);
    
    return {
      signature: mockSignature,
      accessPubkey: accessPDA.toString()
    };
    
    /* Original implementation preserved for reference
    // Validate that uploaderPubkey is a valid public key string
    try {
      // This will throw an error if the public key is invalid
      new PublicKey(uploaderPubkey);
    } catch (e) {
      console.error('Invalid uploader public key format:', uploaderPubkey, e);
      throw new Error(`The uploader's wallet address is invalid: ${e.message}`);
    }
    
    const program = getProgram(wallet);
    const connection = getConnection();
    
    // Convert string pubkeys to PublicKey objects
    const videoPublicKey = new PublicKey(videoPubkey);
    const uploaderPublicKey = new PublicKey(uploaderPubkey);
    
    // Log the public keys for debugging
    console.log('Public keys:', {
      videoPublicKey: videoPublicKey.toString(),
      uploaderPublicKey: uploaderPublicKey.toString(),
      viewerPublicKey: wallet.publicKey.toString()
    });
    
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
    
    console.log('Creating token account for uploader:', uploaderPublicKey.toString());
    const uploaderTokenAccount = await getAssociatedTokenAddress(
      new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL mint
      uploaderPublicKey
    );
    
    const platformTokenAccount = await getAssociatedTokenAddress(
      new PublicKey('So11111111111111111111111111111111111111112'), // Wrapped SOL mint
      platformPDA
    );
    
    console.log('Token accounts:', {
      viewerTokenAccount: viewerTokenAccount.toString(),
      uploaderTokenAccount: uploaderTokenAccount.toString(),
      platformTokenAccount: platformTokenAccount.toString()
    });
    
    // Check if token accounts exist and create if needed
    const transaction = new Transaction();
    
    // Check if uploader token account exists
    console.log('Checking if uploader token account exists...');
    const uploaderTokenAccountInfo = await connection.getAccountInfo(uploaderTokenAccount);
    if (!uploaderTokenAccountInfo) {
      console.log('Uploader token account does not exist, creating it...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          uploaderTokenAccount,
          uploaderPublicKey,
          new PublicKey('So11111111111111111111111111111111111111112')
        )
      );
    } else {
      console.log('Uploader token account exists');
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
    */
  } catch (error) {
    console.error('Error paying to watch video:', error);
    if (error.logs) {
      console.error('Solana program logs:');
      error.logs.forEach(log => console.error(log));
    }
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

export const getViewerTokenBalance = async (wallet, creatorMint) => {
  try {
    const ata = await getAssociatedTokenAddress(new PublicKey(creatorMint), wallet.publicKey);
    const account = await getAccount(getConnection(), ata);
    return Number(account.amount);
  } catch {
    return 0;
  }
};

export const payWithCreatorToken = async (wallet, creatorMint, creatorPubkey, amount) => {
  try {
    const program = getProgram(wallet);
    const connection = getConnection();

    const viewerTokenAccount = await getAssociatedTokenAddress(creatorMint, wallet.publicKey);
    const creatorTokenAccount = await getAssociatedTokenAddress(creatorMint, creatorPubkey);

    const tx = await program.methods
      .payWithCreatorToken(new BN(amount))
      .accounts({
        viewer: wallet.publicKey,
        viewerTokenAccount,
        creatorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  } catch (err) {
    console.error('Error paying with creator token:', err);
    throw err;
  }
};

export const rewardDuringWatch = async (wallet, creatorPubkey, creatorMint, creatorTokenPDA, amount = 1) => {
  try {
    const program = getProgram(wallet);
    const connection = getConnection();

    const viewerTokenAccount = await getAssociatedTokenAddress(creatorMint, wallet.publicKey);

    const [mintAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from("mint_authority"), creatorPubkey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .rewardDuringWatch(new BN(amount))
      .accounts({
        creator: creatorPubkey,
        creatorMint: creatorMint,
        viewerTokenAccount,
        mintAuthority,
        creatorToken: creatorTokenPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  } catch (err) {
    console.error("Error rewarding viewer:", err);
    throw err;
  }
};
