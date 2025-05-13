# STR3AM: Pay-Per-View Blockchain Video Platform

STR3AM is a decentralized video streaming platform built on Solana blockchain that implements a pay-per-view model. Unlike traditional subscription-based platforms, STR3AM allows users to pay only for the content they actually watch.

## Features

- **Pay-Per-View Model**: Users pay tokens only for the videos they want to watch
- **Decentralized Storage**: Videos are stored on Arweave for permanent, censorship-resistant storage
- **Creator Monetization**: Content creators earn tokens directly when users watch their videos
- **Wallet Integration**: Seamless integration with Solana wallets (Phantom, Solflare, etc.)
- **User Profiles**: Customizable profiles for creators and viewers
- **Video Management**: Upload, categorize, and manage video content
- **Video Player**: Custom video player with progress tracking
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Frontend**: React, TailwindCSS, DaisyUI
- **Backend**: Node.js, Express
- **Blockchain**: Solana, Anchor Framework
- **Database**: MongoDB
- **Storage**: Arweave
- **Authentication**: Solana Wallet Adapter

## Architecture

The application consists of three main components:

1. **Solana Smart Contract (Anchor Program)**:
   - Handles payment processing
   - Stores video metadata on-chain
   - Manages access control for videos

2. **Backend API**:
   - Interacts with the Solana blockchain
   - Manages off-chain metadata
   - Handles video uploads to IPFS
   - Provides REST APIs for the frontend

3. **Frontend Application**:
   - User interface for browsing, watching, and uploading videos
   - Wallet integration for payments
   - Video player with access control

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- Solana CLI tools
- Anchor Framework
- IPFS node or Infura IPFS account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/str3am.git
   cd str3am
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     PORT=5000
     MONGO_URI=mongodb://localhost:27017/str3am
     SOLANA_NETWORK=devnet
     PROGRAM_ID=your_program_id
     ARWEAVE_WALLET_JWK={"your":"arweave_wallet_json"}
     ```

4. Deploy the Anchor program:
   ```bash
   cd anchor
   anchor deploy
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Connect your Solana wallet
2. Browse available videos
3. Pay tokens to watch a video
4. Upload your own videos and earn tokens

## Project Structure

```
str3am/
├── anchor/              # Solana smart contract code
├── backend/             # Node.js backend
│   ├── config/          # Configuration files
│   ├── controllers/     # API controllers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   └── middleware/      # Middleware functions
├── frontend/            # React frontend
│   ├── public/          # Static files
│   └── src/             # Source code
│       ├── components/  # React components
│       ├── contexts/    # React contexts
│       ├── pages/       # Page components
│       └── utils/       # Utility functions
└── README.md            # Project documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Solana Foundation
- Anchor Framework
- Arweave
