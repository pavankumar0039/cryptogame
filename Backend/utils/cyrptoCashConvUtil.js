const axios = require('axios');

let cachedPrices = null;
let lastFetch = 0;

async function getCryptoPrices() {
  const now = Date.now();
  if (!cachedPrices || now - lastFetch > 10000) {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    cachedPrices = {
      BTC: res.data.bitcoin.usd,
      ETH: res.data.ethereum.usd,
    };
    lastFetch = now;
  }
  return cachedPrices;
}

module.exports = { getCryptoPrices };
