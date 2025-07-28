const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  playerId: mongoose.Schema.Types.ObjectId,
  usdAmount: Number,
  cryptoAmount: Number,
  currency: String,
  transactionType: String, 
  transactionHash: String,
  priceAtTime: Number,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', transactionSchema);
