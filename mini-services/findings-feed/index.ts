import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer((req, res) => {
  // HTTP bridge for API routes to push events into WebSocket clients
  if (req.method === 'POST' && req.url === '/hook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const event = JSON.parse(body);
        const { type, data } = event;

        if (type === 'finding' && data) {
          io.to('findings').emit('finding:new', data);
          console.log(`[Feed] Finding relayed: ${data.secretType} in ${data.repoName}`);
        }
        if (type === 'progress' && data) {
          activeScans.set(data.scanId, data);
          io.to('scans').emit('scan:progress', data);
        }
        if (type === 'started' && data) {
          activeScans.set(data.scanId, { ...data, statsTotal: 0, statsNew: 0, statsDuplicate: 0, progress: 0 });
          io.to('scans').emit('scan:started', data);
          console.log(`[Feed] Scan started: ${data.scanId}`);
        }
        if (type === 'complete' && data) {
          const scan = activeScans.get(data.scanId);
          if (scan) { scan.status = 'completed'; scan.progress = 100; activeScans.delete(data.scanId); }
          io.to('scans').emit('scan:completed', { ...data, status: 'completed', progress: 100 });
          console.log(`[Feed] Scan completed: ${data.scanId} — ${data.statsNew} new`);
        }
        if (type === 'error' && data) {
          io.to('scans').emit('scan:error', data);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeScans: activeScans.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

const io = new Server(httpServer, {
  path: '/ws',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const activeScans = new Map<string, any>();

io.on('connection', (socket) => {
  console.log(`[Feed] Client connected: ${socket.id}`);
  socket.emit('connected', {
    message: 'SecretScout Pro — Real-time scan feed active',
    timestamp: new Date().toISOString(),
    activeScansCount: activeScans.size,
  });

  socket.on('subscribe:findings', () => {
    socket.join('findings');
    console.log(`[Feed] ${socket.id} subscribed to findings`);
  });

  socket.on('subscribe:scans', () => {
    socket.join('scans');
    for (const [, progress] of activeScans) {
      socket.emit('scan:progress', progress);
    }
    console.log(`[Feed] ${socket.id} subscribed to scans`);
  });

  socket.on('disconnect', () => console.log(`[Feed] Client disconnected: ${socket.id}`));
  socket.on('error', (error) => console.error(`[Feed] Socket error:`, error));
});

const PORT = 3004;
httpServer.listen(PORT, () => {
  console.log(`[Feed] WebSocket server running on port ${PORT}`);
  console.log(`[Feed] HTTP bridge: POST http://localhost:${PORT}/hook`);
  console.log(`[Feed] Health: GET http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => { console.log('[Feed] Shutting down...'); httpServer.close(() => process.exit(0)); });
process.on('SIGINT', () => { console.log('[Feed] Shutting down...'); httpServer.close(() => process.exit(0)); });