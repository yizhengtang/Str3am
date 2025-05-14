const { program } = require('../config/anchor');

exports.createCreatorToken = async (req, res) => {
  try {
    const { creator, decimals } = req.body; // creator = public key string

    // Derive PDAs and prepare accounts
    const creatorPubkey = new anchor.web3.PublicKey(creator);

    // Derive the creator_token PDA
    const [creatorTokenPda, creatorTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('creator_token'), creatorPubkey.toBuffer()],
      program.programId
    );

    // Derive the mint authority PDA
    const [mintAuthorityPda, mintAuthorityBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('mint_authority'), creatorPubkey.toBuffer()],
      program.programId
    );

    // Create a new mint account (let Anchor handle it)
    const mint = anchor.web3.Keypair.generate();

    // Call the Anchor program
    const tx = await program.methods
      .createCreatorToken(decimals)
      .accounts({
        creator: creatorPubkey,
        creatorMint: mint.publicKey,
        creatorToken: creatorTokenPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc();

    res.json({
      success: true,
      tx,
      mint: mint.publicKey.toString(),
      creatorToken: creatorTokenPda.toString(),
      mintAuthority: mintAuthorityPda.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// List all channel tokens and balances for a given viewer wallet
exports.listViewerTokens = async (req, res, next) => {
  try {
    const { walletAddress: viewer } = req.params;
    const { getProvider, getProgram } = require('../config/anchor');
    const { getAccount, getAssociatedTokenAddress } = require('@solana/spl-token');
    const CreatorToken = require('../models/CreatorToken');
    const Video = require('../models/Video');
    const VideoAccess = require('../models/VideoAccess');
    const User = require('../models/User');

    const provider = getProvider();
    const program = getProgram();
    const entries = await CreatorToken.find();
    const results = [];
    const THRESHOLD = 30; // seconds per token
    for (const ct of entries) {
      const mintPub = new (require('@solana/web3.js').PublicKey)(ct.mint);
      const viewerPub = new (require('@solana/web3.js').PublicKey)(viewer);
      const ata = await getAssociatedTokenAddress(mintPub, viewerPub);
      let amount = 0;
      try {
        const accountInfo = await getAccount(provider.connection, ata);
        amount = Number(accountInfo.amount);
      } catch {
        amount = 0;
      }
      if (amount > 0) {
        // Compute cumulative watch time across all videos by this creator
        const videos = await Video.find({ uploader: ct.creator }).select('_id').lean();
        const videoIds = videos.map(v => v._id);
        const agg = await VideoAccess.aggregate([
          { $match: { viewerWallet: viewer, videoId: { $in: videoIds } } },
          { $group: { _id: null, totalWatch: { $sum: '$watchTime' } } }
        ]);
        const totalWatch = agg[0]?.totalWatch || 0;
        // Progress towards next token
        const progress = (totalWatch % THRESHOLD) / THRESHOLD;
        const creatorUser = await User.findOne({ walletAddress: ct.creator });
        results.push({
          creator: ct.creator,
          username: creatorUser?.username || ct.creator,
          balance: amount,
          progress
        });
      }
    }
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
