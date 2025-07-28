import './App.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = 'https://cryptogame-1.onrender.com/api';
const socket = io('https://cryptogame-1.onrender.com');

function App() {
  const [player, setPlayer] = useState(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [isRunning, setIsRunning] = useState(false);
  const [bets, setBets] = useState([]);
  const [crashPoint, setCrashPoint] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [results, setResults] = useState([]);
  const [wallet, setWallet] = useState({});
  const [currentRound, setCurrentRound] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [messages, setMessages] = useState([]);

  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinDetails, setJoinDetails] = useState({
    username: '',
    email: '',
    amount: 1000,
  });

  const growthFactor = 2.5;

  // Socket listeners after loading player
  useEffect(() => {
    const storedUser = localStorage.getItem('User');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setPlayer(parsed);

      socket.on('connect', () => {
        console.log('Connected:', socket.id);
        socket.emit('register_player', parsed.id); // ✅ Register player ID with socket
      });

      socket.on('room_assigned', (room) => {
        setRoomCode(room);
        localStorage.setItem('roomCode', room);
      });

      socket.on('broadcast', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });
    }
  }, []);

  // Fetch wallet
  useEffect(() => {
    const fetchWallet = async () => {
      if (!player?.id) return;
      try {
        const res = await axios.get(`${API}/game/wallet/${player.id}`);
        setWallet(res.data);
      } catch (err) {
        console.error('Failed to fetch wallet:', err);
      }
    };
    fetchWallet();
  }, [player, results]);

  // Multiplier animation
  useEffect(() => {
    let start = null;
    let raf;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = (timestamp - start) / 1000;
      const next = parseFloat((1 + elapsed * growthFactor).toFixed(2));

      if (next >= crashPoint) {
        handleCrash();
        setMultiplier(crashPoint);
        setIsRunning(false);
      } else {
        setMultiplier(next);
        raf = requestAnimationFrame(step);
      }
    };

    if (isRunning && crashPoint) {
      raf = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(raf);
  }, [isRunning, crashPoint]);

  const handleCrash = () => {
    const updated = bets.map((b) => {
      if (b.cashedOut) return b;
      return { ...b, status: 'LOSS', payout: 0 };
    });
    setResults((prev) => [...prev, ...updated]);
    setMultiplier(1.0);
    setBets([]);
  };

  const handleStart = () => {
    if (isRunning || bets.length === 0) return;
    setMultiplier(1.0);
    setIsRunning(true);
  };

  const placeBet = async () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0 || !player?.id) return;

    try {
      const res = await axios.post(`${API}/game/place-bet`, {
        playerId: player.id,
        usdAmount: amount,
        currency: 'BTC',
      });

      const bet = {
        amount: amount,
        cryptoAmount: res.data.bet.cryptoAmount,
        cashedOut: false,
        payout: 0,
        status: 'IN GAME',
        cashedOutAt: null,
        roundNumber: res.data.roundNumber,
      };

      setBets([bet]);
      setCurrentRound(res.data.roundNumber);
      setCrashPoint(res.data.crashPoint);
      setBetAmount('');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to place bet');
    }
  };

  const cashOut = async () => {
    if (!isRunning || bets.length === 0 || !player?.id) return;

    try {
      const res = await axios.post(`${API}/game/cashout`, {
        playerId: player.id,
        roundNumber: currentRound,
        multiplier: multiplier,
      });

      const updatedBets = bets.map((b) => ({
        ...b,
        cashedOut: true,
        payout: res.data.result.usdEquivalent,
        status: 'WIN',
        cashedOutAt: res.data.result.multiplier,
      }));
      setMultiplier(1.0);
      setResults((prev) => [...prev, ...updatedBets]);
      setBets([]);
      setIsRunning(false);
    } catch (err) {
      alert(err?.response?.data?.message || 'Cashout failed');
    }
  };

  const handleJoin = async () => {
    try {
      const res = await axios.post(`${API}/game/register`, {
        username: joinDetails.username,
        email: joinDetails.email,
        amount: joinDetails.amount,
      });

      const user = {
        id: res.data.playerId,
        username: joinDetails.username,
        email: joinDetails.email,
      };

      localStorage.setItem('User', JSON.stringify(user));
      setPlayer(user);
      setShowJoinForm(false);

      socket.emit('register_player', user.id);
    } catch (err) {
      alert('Registration failed.');
    }
  };

  const usdBalance = wallet?.usdBalance || 0;

  return (
    <>
      {player ? (
        <div className="min-h-screen bg-gray-900 text-white">
          <div className="bg-gray-800 p-4 flex justify-between items-center shadow-md fixed top-0 left-0 right-0 z-10">
            <h1 className="text-2xl font-bold text-green-400">🚀 Crash Game</h1>
            <div className="text-lg font-semibold">
              💰 Balance: <span className="text-yellow-400">${parseFloat(usdBalance).toFixed(2)}</span>
            </div>
          </div>

          <div className="h-[100px]"></div>

          <div className="flex gap-2 justify-center">
            <div className="w-[45%] bg-gray-800">
              {bets.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-lg flex justify-between items-center text-lg font-medium text-white shadow-md">
                  <div>
                    🎲 Total Bet: <span className="text-yellow-400">${bets.reduce((sum, b) => sum + b.amount, 0).toFixed(2)}</span>
                  </div>
                  <div>
                    📈 Current Value: <span className="text-green-400">
                      ${(bets.reduce((sum, b) => sum + b.amount, 0) * multiplier).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-center my-10">
                <div className={`text-7xl font-extrabold ${!isRunning ? 'text-red-500' : 'text-green-400'}`}>
                  {multiplier.toFixed(2)}x
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-lg max-w-lg mx-auto mb-8 space-y-4">
                <h2 className="text-xl font-semibold">Place Your Bet</h2>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 rounded bg-black text-white border border-gray-600 focus:outline-none"
                />
                <button
                  onClick={placeBet}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold"
                  disabled={isRunning}
                >
                  Place Bet
                </button>
              </div>

              <div className="flex justify-center space-x-4 mb-8">
                <button
                  className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-white font-semibold"
                  onClick={cashOut}
                >
                  Cash Out
                </button>
                <button
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
                  onClick={handleStart}
                >
                  Start Round
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 w-[50%]">
              <h2 className="text-xl font-semibold mb-4">🎯 Bet History</h2>
              {results.length === 0 ? (
                <p className="text-gray-400">No results yet.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-300 border-b border-gray-600">
                      <th className="p-2">Amount</th>
                      <th className="p-2">Multiplier</th>
                      <th className="p-2">Payout</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((b, i) => (
                      <tr key={i} className="border-b border-gray-700">
                        <td className="p-2">${b.amount.toFixed(2)}</td>
                        <td className="p-2">{b.status === 'WIN' ? b.cashedOutAt.toFixed(2) + 'x' : '-'}</td>
                        <td className="p-2">${b.payout.toFixed(2)}</td>
                        <td className={`p-2 font-semibold ${b.status === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                          {b.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="text-center text-gray-400 mt-6">💥 Crash point: {crashPoint ? crashPoint + 'x' : '–'}</div>
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl p-5 mt-6 shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
              📢 Announcements
            </h2>

            <div className="h-48 overflow-y-auto bg-white/5 backdrop-blur-md rounded-lg p-3 space-y-2 border border-gray-600 shadow-inner">
              {messages.length === 0 ? (
                <div className="text-gray-400 text-center">No messages yet...</div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="text-md text-white bg-gray-700/60 px-3 py-2 rounded-lg w-fit max-w-[90%]"
                  >
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center relative">
          <button
            onClick={() => setShowJoinForm(true)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white font-semibold cursor-pointer"
          >
            Join game
          </button>

          {showJoinForm && (
            <div className="absolute top-10 right-10 bg-gray-800 p-6 rounded-lg shadow-lg w-80 animate-slide-in z-20">
              <h2 className="text-xl font-bold mb-4 text-green-400">Join Game</h2>
              <input
                type="text"
                placeholder="Username"
                value={joinDetails.username}
                onChange={(e) => setJoinDetails({ ...joinDetails, username: e.target.value })}
                className="w-full mb-2 p-2 rounded bg-black text-white border border-gray-600"
              />
              <input
                type="email"
                placeholder="Email"
                value={joinDetails.email}
                onChange={(e) => setJoinDetails({ ...joinDetails, email: e.target.value })}
                className="w-full mb-2 p-2 rounded bg-black text-white border border-gray-600"
              />
              <input
                type="number"
                placeholder="Amount"
                value={joinDetails.amount}
                onChange={(e) => setJoinDetails({ ...joinDetails, amount: e.target.value })}
                className="w-full mb-4 p-2 rounded bg-black text-white border border-gray-600"
              />
              <button
                onClick={handleJoin}
                className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
              >
                Join
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
