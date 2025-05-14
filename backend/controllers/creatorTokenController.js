const anchor = require('@project-serum/anchor');
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
