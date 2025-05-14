const anchor = require('../config/anchor');
const { getProvider } = require('../config/anchor');
const { getProgram } = require('../config/anchor');
const { PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount } = require('@solana/spl-token');
const CreatorToken = require('../models/CreatorToken');
const Video = require('../models/Video');
const VideoAccess = require('../models/VideoAccess');

exports.rewardDuringWatch = async (req, res, next) => {
  try {
    const { viewer, videoId } = req.body;

    // 1. Get video and creator info
    const video = await Video.findById(videoId);
    const creator = video.uploader;
    const creatorToken = await CreatorToken.findOne({ creator });

    if (!creatorToken) return res.status(400).json({ error: 'Creator token not found' });

    const provider = getProvider();
    const program = getProgram(provider);

    const mint = new PublicKey(creatorToken.mint);
    const creatorPub = new PublicKey(creator);
    const viewerPub = new PublicKey(viewer);

    // 2. Derive mint authority PDA
    const [mintAuthority] = await PublicKey.findProgramAddress(
      [Buffer.from('mint_authority'), creatorPub.toBuffer()],
      program.programId
    );

    // 3. Get viewer's associated token account
    const viewerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      viewerPub
    );

    // 4. Call Anchor reward instruction
    await program.methods
      .rewardDuringWatch(new anchor.BN(1)) // reward 1 token, change logic if needed
      .accounts({
        creator: creatorPub,
        creatorMint: mint,
        viewerTokenAccount: viewerTokenAccount.address,
        mintAuthority,
        creatorToken: new PublicKey(creatorToken._id), // or PDA if used
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    res.status(200).json({ success: true, reward: 1 });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
