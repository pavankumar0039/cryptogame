const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const gameRoutes = require('./routes');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
const allowedOrigins = ['https://cryptogame-phi.vercel.app/'];
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use('/api/game', gameRoutes);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));


const rooms = {}; 
const socketToRoom = {}; 
const userToRoom = {};  
const roomLimit = 5;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let assignedRoom = null;
  for (const roomCode in rooms) {
    if (rooms[roomCode].length < roomLimit) {
      rooms[roomCode].push(socket.id);
      assignedRoom = roomCode;
      break;
    }
  }

  if (!assignedRoom) {
    assignedRoom = crypto.randomBytes(3).toString('hex');
    rooms[assignedRoom] = [socket.id];
  }

  socketToRoom[socket.id] = assignedRoom;
  socket.join(assignedRoom);
  socket.emit('room_assigned', assignedRoom);

  io.to(assignedRoom).emit('group_members', rooms[assignedRoom]);

  socket.on('register_player', (playerId) => {
    userToRoom[playerId] = assignedRoom;
    console.log(`Mapped playerId ${playerId} to room ${assignedRoom}`);
  });

  socket.on('disconnect', () => {
    const room = socketToRoom[socket.id];
    if (room) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit('group_members', rooms[room]);
      }
      delete socketToRoom[socket.id];
    }
    console.log('Client disconnected:', socket.id);
  });
});

app.post('/api/broadcast', (req, res) => {
  const { message } = req.body;
  for (const room in rooms) {
    io.to(room).emit('broadcast', message);
  }
  res.status(200).send({ status: 'Broadcast sent' });
});

global.userToRoom = userToRoom;
global.io = io;

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
