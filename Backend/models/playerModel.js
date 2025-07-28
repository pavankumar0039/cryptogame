const mongoose = require('mongoose');

const walletSchema = {
    BTC: { type: Number, default: 0 },
    ETH: { type: Number, default: 0 },
};

const playerSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: String,
    amount: { // USD balance
        type: Number,
        default: 0,
    },
    wallet: walletSchema,
});

module.exports = mongoose.model('Player', playerSchema);
