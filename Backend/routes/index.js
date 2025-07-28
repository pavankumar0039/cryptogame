const express = require('express');
const router = express.Router();
const Player = require('../models/playerModel');
const Round = require('../models/RoundModel');
const Transaction = require('../models/transaction');
const { generateCrashPoint, generateMockTxHash } = require('../utils/cyrptoCrashGenUtil');
const { getCryptoPrices } = require('../utils/cyrptoCashConvUtil');
const { randomInt } = require('crypto');

let currentRoundNumber = 1;

router.post('/register', async (req, res) => {
  try {
    const { username, email, amount = 1000 } = req.body;

    const prices = await getCryptoPrices();
    const wallet = {
      BTC: amount / prices.BTC,
      ETH: amount / prices.ETH,
    };

    const newPlayer = new Player({ username, email, amount, wallet });
    await newPlayer.save();

    res.status(201).json({
      message: 'Player registered successfully',
      playerId: newPlayer._id,
      wallet,
      usdBalance: amount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering player' });
  }
});


router.post('/place-bet', async (req, res) => {
  try {
    const { playerId, usdAmount, currency } = req.body;
    const player = await Player.findById(playerId);
    const prices = await getCryptoPrices();

    const price = prices[currency];
    const cryptoAmount = usdAmount / price;

    if (player.wallet[currency] < cryptoAmount || player.amount < usdAmount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    const seed = 'server-secret-seed';
    const crashPoint = generateCrashPoint(seed, currentRoundNumber + randomInt(-1000, 1000));

    player.wallet[currency] -= cryptoAmount;
    player.amount -= usdAmount;
    await player.save();

    const bet = {
      playerId,
      usdAmount,
      cryptoAmount,
      currency,
      cashedOut: false,
      multiplier: null,
    };

    let round = await Round.findOne({ roundNumber: currentRoundNumber });
    if (!round) {
      round = new Round({ roundNumber: currentRoundNumber, seed, crashPoint, bets: [bet] });
    } else {
      round.bets.push(bet);
    }
    await round.save();
    const room = global.userToRoom[playerId];
    if (room) {
      global.io.to(room).emit('broadcast', `${player.username || playerId} placed $${usdAmount} bet.`);
    }
    const tx = new Transaction({
      playerId,
      usdAmount,
      cryptoAmount,
      currency,
      transactionType: "bet",
      transactionHash: generateMockTxHash(),
      priceAtTime: price,
    });
    await tx.save();

    res.json({
      message: "Bet placed",
      bet: {
        amount: usdAmount,
        cryptoAmount,
        cashedOut: false,
        payout: 0,
        status: 'IN GAME',
        cashedOutAt: null,
        roundNumber: round.roundNumber,
      },
      roundNumber: round.roundNumber,
      crashPoint,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


router.post('/cashout', async (req, res) => {
  try {
    const { playerId, roundNumber, multiplier } = req.body;
    const round = await Round.findOne({ roundNumber });
    const bet = round.bets.find(b => b.playerId.toString() === playerId && !b.cashedOut);

    if (!bet) return res.status(404).json({ message: "No valid bet found" });
    if (multiplier > round.crashPoint) return res.status(400).json({ message: "Crash happened before cashout" });

    const cryptoWon = bet.cryptoAmount * multiplier;
    const prices = await getCryptoPrices();
    const usdEquivalent = cryptoWon * prices[bet.currency];

    await Player.findByIdAndUpdate(playerId, {
      $inc: {
        [`wallet.${bet.currency}`]: cryptoWon,
        amount: usdEquivalent,
      },
    });

    bet.cashedOut = true;
    bet.multiplier = multiplier;
    await round.save();
    const player = await Player.findById(playerId);
    const room = global.userToRoom[playerId];
    if (room) {
      global.io.to(room).emit('broadcast', `${player.username || playerId} cashedout an amount of $${usdEquivalent}.`);
    }

    const tx = new Transaction({
      playerId,
      usdAmount: usdEquivalent,
      cryptoAmount: cryptoWon,
      currency: bet.currency,
      transactionType: "cashout",
      transactionHash: generateMockTxHash(),
      priceAtTime: prices[bet.currency],
    });
    await tx.save();

    res.json({
      message: "Cashed out",
      result: {
        cryptoWon,
        usdEquivalent,
        multiplier,
        roundNumber,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


router.get('/wallet/:playerId', async (req, res) => {
  try {
    const player = await Player.findById(req.params.playerId);
    let prices;
    try {
      prices = await getCryptoPrices();
      
    } catch (err) {
      return res.status(503).json({ message: "Price data unavailable. Try again later." });
    }

    const walletUSD = {};
    for (let coin in player.wallet) {
      walletUSD[coin] = {
        crypto: player.wallet[coin],
        usd: (player.wallet[coin] * prices[coin]).toFixed(2),
      };
    }

    res.json({
      wallet: walletUSD,
      usdBalance: player.amount.toFixed(2),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching wallet");
  }
});

module.exports = router;
