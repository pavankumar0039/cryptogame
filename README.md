// steps to follow for setup project

step1: Clone the project from github.
step2: Go to project directory in any editor (eg:vscode).
step3: Split the terminal into two.
step4: In one terminal type cd ./Frontend.
step5: In another terminal type cd ./Backend.
step6: In both the terminal type npm install.
step7: In backend terminal type node server.js to run backend.
step8: In frontend terminal type npm start to run project

//apis in backend

* "/api/game/register" used to register user to join the game so user get one room to play and user got a chance to place bet and gain profits
* "/api/game/place-bet" this will start round and player create round and we are storing the round data like this
* (roundNumber: Number,
  seed: String,
  crashPoint: Number,
  bets: (
    playerId: mongoose.Schema.Types.ObjectId,
    usdAmount: Number,
    cryptoAmount: Number,
    currency: String,
    cashedOut: Boolean,
    multiplier: Number,
  ),
  timestamp: { type: Date, default: Date.now },).

  * "/api/game/checkout" this api helps to calculate his payout according to multiplier and based on crypto value and returns the data and made his transaction.
  * cyrptoCashConvUtil.js module helps to get crypto values and convert it user usd into crypto currency and to solve request failure i used to store the
    crypto value for every three minutes (caching) so its helps to not overlimit the api request for coingecko.
  * "/api/game//wallet/:playerId" this api helps to send user data to frontend like amount in usd and in crypto
 
  
