let cache = null;
let lastFetched = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

const axios = require('axios');

async function getCryptoPrices() {
  const now = Date.now();
  if (cache && (now - lastFetched < CACHE_TTL)) {
    return cache;
  }

  try {
    const res = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'
    );
    cache = {
      BTC: res.data.bitcoin.usd,
      ETH: res.data.ethereum.usd,
    };
    lastFetched = now;
    return cache;
  } catch (err) {
    console.error("Error fetching crypto prices", err.message);
    throw new Error("Rate limited by CoinGecko");
  }
}

module.exports = { getCryptoPrices };