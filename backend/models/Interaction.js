const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true
    },
    userWallet: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['like', 'dislike', 'share'],
      required: true
    },
    // For shares, we can track where it was shared to
    sharedTo: {
      type: String,
      enum: ['twitter', 'facebook', 'telegram', 'whatsapp', 'email', 'other'],
      required: function() {
        return this.type === 'share';
      }
    },
    // If user changes their reaction (e.g., from like to dislike)
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Create a compound unique index to prevent duplicate interactions of the same type
InteractionSchema.index({ videoId: 1, userWallet: 1, type: 1 }, { unique: true });
InteractionSchema.index({ videoId: 1, type: 1 });
InteractionSchema.index({ userWallet: 1 });

module.exports = mongoose.model('Interaction', InteractionSchema); 