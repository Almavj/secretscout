import { createServer } from 'http'
import { Server } from 'socket.io'

// ============================================================================
// SecretScout Pro — Real-time Findings Feed WebSocket Service
// Port: 3004
//
// This service provides real-time finding notifications to the dashboard.
// In production, this would consume from Kafka/NATS after the detection
// pipeline processes scan results. For the demo, it simulates new findings
// arriving from the discovery layer.
// ============================================================================

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface FindingPayload {
  id: string
  secretType: string
  severity: string
  repoName: string
  filePath: string
  commitHash: string
  commitAuthor: string
  isVerified: boolean
  isForkMatch: boolean
  discoveredAt: string
  status: string
}

interface ScanProgress {
  scanId: string
  status: string
  scanType: string
  statsTotal: number
  statsNew: number
  statsDuplicate: number
  progress?: number
}

// Simulated finding types for demo
const SIMULATED_FINDINGS: Array<Omit<FindingPayload, 'id' | 'discoveredAt'>> = [
  { secretType: 'AWS Access Key ID', severity: 'critical', repoName: 'acme-corp/core-api', filePath: '.env.staging', commitHash: 'x9y8z7w6', commitAuthor: 'ci-bot', isVerified: false, isForkMatch: false, status: 'open' },
  { secretType: 'GitHub PAT', severity: 'critical', repoName: 'acme-corp/payment-service', filePath: 'src/config/github.ts', commitHash: 'v5u4t3s2', commitAuthor: 'james-wilson', isVerified: false, isForkMatch: false, status: 'open' },
  { secretType: 'Stripe Secret Key', severity: 'critical', repoName: 'acme-corp/mobile-app', filePath: 'config/secrets.json', commitHash: 'r1q2p3o4', commitAuthor: 'deploy-bot', isVerified: false, isForkMatch: true, status: 'open' },
  { secretType: 'Private Key (RSA)', severity: 'critical', repoName: 'acme-corp/legacy-monolith', filePath: 'keys/prod.pem', commitHash: 'n5m6l7k8', commitAuthor: 'sarah-chen', isVerified: false, isForkMatch: false, status: 'open' },
  { secretType: 'Generic API Key', severity: 'high', repoName: 'acme-corp/infra-terraform', filePath: 'terraform/outputs.tf', commitHash: 'j1i2h3g4', commitAuthor: 'deploy-bot', isVerified: false, isForkMatch: false, status: 'open' },
  { secretType: 'Slack Token', severity: 'high', repoName: 'acme-corp/core-api', filePath: 'scripts/notify.sh', commitHash: 'f5e6d7c8', commitAuthor: 'sarah-chen', isVerified: true, isForkMatch: false, status: 'open' },
  { secretType: 'Database Password', severity: 'high', repoName: 'acme-corp/mobile-app', filePath: 'docker-compose.yml', commitHash: 'b9a8z7y6', commitAuthor: 'james-wilson', isVerified: false, isForkMatch: false, status: 'open' },
  { secretType: 'SendGrid API Key', severity: 'high', repoName: 'acme-corp/core-api', filePath: '.env.production', commitHash: 'x1w2v3u4', commitAuthor: 'ci-bot', isVerified: false, isForkMatch: false, status: 'open' },
]

let findingCounter = 0

function generateId() {
  findingCounter++
  return `sim-${Date.now()}-${findingCounter}`
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Simulate a new finding arriving
function createSimulatedFinding(): FindingPayload {
  const template = randomItem(SIMULATED_FINDINGS)
  return {
    ...template,
    id: generateId(),
    discoveredAt: new Date().toISOString(),
  }
}

// Active scan simulation
const activeScans = new Map<string, ScanProgress>()

function createScanProgress(): ScanProgress {
  return {
    scanId: `scan-sim-${Date.now()}`,
    status: 'running',
    scanType: randomItem(['scheduled_dork', 'realtime_event', 'fork_walk']),
    statsTotal: 0,
    statsNew: 0,
    statsDuplicate: 0,
    progress: 0,
  }
}

io.on('connection', (socket) => {
  console.log(`[FindingsFeed] Client connected: ${socket.id}`)

  // Send initial connection confirmation
  socket.emit('connected', {
    message: 'SecretScout Pro — Real-time findings feed active',
    timestamp: new Date().toISOString(),
    activeScansCount: activeScans.size,
  })

  // Client can subscribe to finding updates
  socket.on('subscribe:findings', () => {
    socket.join('findings')
    console.log(`[FindingsFeed] ${socket.id} subscribed to findings`)
  })

  // Client can subscribe to scan progress
  socket.on('subscribe:scans', () => {
    socket.join('scans')
    // Send current active scans
    for (const [, progress] of activeScans) {
      socket.emit('scan:progress', progress)
    }
    console.log(`[FindingsFeed] ${socket.id} subscribed to scan progress`)
  })

  socket.on('disconnect', () => {
    console.log(`[FindingsFeed] Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`[FindingsFeed] Socket error (${socket.id}):`, error)
  })
})

// ============================================================================
// Simulation: Periodically emit new findings (every 8-15 seconds)
// In production, this would be replaced by Kafka/NATS consumer
// ============================================================================
let simulationInterval: ReturnType<typeof setInterval> | null = null
let scanInterval: ReturnType<typeof setInterval> | null = null

function startSimulation() {
  // New findings every 8-15 seconds
  const emitFinding = () => {
    const finding = createSimulatedFinding()
    io.to('findings').emit('finding:new', finding)
    io.emit('finding:new', finding) // Also broadcast to all
    console.log(`[FindingsFeed] New finding: ${finding.secretType} in ${finding.repoName}`)

    // Schedule next with random delay
    if (simulationInterval) clearTimeout(simulationInterval)
    simulationInterval = setTimeout(emitFinding, 8000 + Math.random() * 7000)
  }

  // Start after initial delay
  simulationInterval = setTimeout(emitFinding, 5000)

  // Scan progress updates every 3-5 seconds
  const emitScanUpdate = () => {
    // Create new scan occasionally
    if (activeScans.size < 2 && Math.random() < 0.3) {
      const scan = createScanProgress()
      activeScans.set(scan.scanId, scan)
      io.emit('scan:started', scan)
    }

    // Update existing scans
    for (const [id, scan] of activeScans) {
      const increment = Math.floor(Math.random() * 15) + 5
      scan.statsTotal += increment
      scan.statsNew += Math.random() < 0.3 ? 1 : 0
      scan.statsDuplicate += scan.statsNew === 0 ? 1 : 0
      scan.progress = Math.min(100, (scan.progress || 0) + Math.floor(Math.random() * 10) + 3)

      io.emit('scan:progress', scan)

      // Complete scan at 100%
      if (scan.progress >= 100) {
        scan.status = 'completed'
        io.emit('scan:completed', scan)
        activeScans.delete(id)
      }
    }

    scanInterval = setTimeout(emitScanUpdate, 3000 + Math.random() * 2000)
  }

  scanInterval = setTimeout(emitScanUpdate, 8000)
}

startSimulation()

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`[FindingsFeed] WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FindingsFeed] Shutting down...')
  if (simulationInterval) clearTimeout(simulationInterval)
  if (scanInterval) clearTimeout(scanInterval)
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('[FindingsFeed] Shutting down...')
  if (simulationInterval) clearTimeout(simulationInterval)
  if (scanInterval) clearTimeout(scanInterval)
  httpServer.close(() => process.exit(0))
})