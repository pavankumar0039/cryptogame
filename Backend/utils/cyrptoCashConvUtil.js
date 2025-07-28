const axios = require('axios');

let cachedPrices = null;
let lastFetch = 0;

async function getCryptoPrices() {
  const now = Date.now();
  if (!cachedPrices || now - lastFetch > 10000) {
    const res = await axios.get(process.env.CRYPTO_SECRET_KEY);
    cachedPrices = {
      BTC: res.data.bitcoin.usd,
      ETH: res.data.ethereum.usd,
    };
    lastFetch = now;
  }
  return cachedPrices;
}

module.exports = { getCryptoPrices };
