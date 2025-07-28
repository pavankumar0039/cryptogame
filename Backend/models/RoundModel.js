const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  roundNumber: Number,
  seed: String,
  crashPoint: Number,
  bets: [{
    playerId: mongoose.Schema.Types.ObjectId,
    usdAmount: Number,
    cryptoAmount: Number,
    currency: String,
    cashedOut: Boolean,
    multiplier: Number,
  }],
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Round', roundSchema);
