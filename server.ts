import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RoomManager } from './server/roomManager.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);

app.use(express.json());

// GET /health
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/rooms/create
app.post('/api/rooms/create', (req, res) => {
  const { hostId, hostName, hostAvatar, targetScore } = req.body;
  if (!hostId || !hostName) {
    return res.status(400).json({ error: 'hostId and hostName are required' });
  }

  const room = roomManager.createRoom(
    hostId,
    hostName,
    hostAvatar || 'user',
    targetScore ? Number(targetScore) as 200 | 300 | 500 : 300
  );
  return res.status(201).json({ room });
});

// POST /api/rooms/join
app.post('/api/rooms/join', (req, res) => {
  const { code, playerId, name, avatar } = req.body;
  if (!code || !playerId || !name) {
    return res.status(400).json({ error: 'code, playerId, and name are required' });
  }

  const result = roomManager.joinRoom(code, playerId, name, avatar || 'user');
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(200).json({ room: result.room });
});

// GET /api/rooms/:code
app.get('/api/rooms/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.status(200).json({ room });
});

// Socket.IO event handlers
io.on('connection', socket => {
  socket.on('player:register', ({ playerId, name, avatar, roomCode }) => {
    roomManager.registerSocketForPlayer(socket.id, playerId);
    if (roomCode) {
      roomManager.handleSocketConnect(socket, playerId, name, avatar, roomCode);
    }
  });

  socket.on('room:join_socket', ({ roomCode, playerId, name, avatar }) => {
    socket.join(`room:${roomCode}`);
    roomManager.registerSocketForPlayer(socket.id, playerId);
    roomManager.handleSocketConnect(socket, playerId, name, avatar, roomCode);
  });

  socket.on('room:add_bot', ({ roomCode, requesterId }) => {
    roomManager.addBot(roomCode, requesterId);
  });

  socket.on('room:remove_bot', ({ roomCode, requesterId, seatIndex }) => {
    roomManager.removeBot(roomCode, requesterId, seatIndex);
  });

  socket.on('room:start', ({ roomCode, requesterId }) => {
    roomManager.startGame(roomCode, requesterId);
  });

  socket.on('game:make_call', ({ roomCode, playerId, callValue }) => {
    roomManager.makeCall(roomCode, playerId, callValue);
  });

  socket.on('game:play_card', ({ roomCode, playerId, card }) => {
    roomManager.playCard(roomCode, playerId, card);
  });

  socket.on('game:next_round', ({ roomCode, requesterId }) => {
    roomManager.nextRound(roomCode, requesterId);
  });

  socket.on('game:restart', ({ roomCode, requesterId }) => {
    roomManager.restartGame(roomCode, requesterId);
  });

  socket.on('game:redeal_dismissed', ({ roomCode, requesterId }) => {
    roomManager.redealDismissed(roomCode, requesterId);
  });

  socket.on('disconnect', () => {
    roomManager.handleSocketDisconnect(socket);
  });
});

// Mount Vite in development or serve static files in production
const distPath = path.resolve(__dirname, 'dist');
const hasDist = fs.existsSync(distPath);
const isProduction = process.env.NODE_ENV === 'production' || hasDist;

async function startServer() {
  if (isProduction && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';
  server.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
