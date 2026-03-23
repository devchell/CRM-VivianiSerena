import 'dotenv/config'
import { createApp } from './app'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import { logger } from './lib/logger'
import { apiEnv } from './lib/env'
import { redis } from './lib/redis'
import { prisma } from './lib/prisma'
import { setupSocketHandlers } from './socket/handlers'
import { startAllJobs } from './infrastructure/jobs'

const PORT = apiEnv.apiPort
const HOST = apiEnv.apiHost

async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('✅ Database connected')

    await redis.ping()
    logger.info('✅ Redis connected')

    const app = createApp()
    const httpServer = createServer(app)

    const io = new SocketServer(httpServer, {
      cors: {
        origin: apiEnv.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    })

    // Make io available in Express routes via req.app.get('io')
    app.set('io', io)

    setupSocketHandlers(io)

    // Start background jobs
    startAllJobs()

    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 API server running at http://${HOST}:${PORT}`)
      logger.info(`📡 Socket.io ready`)
      logger.info(`🌍 Environment: ${apiEnv.nodeEnv}`)
      if (apiEnv.nodeEnv !== 'production') {
        logger.info(`📚 Swagger docs: ${apiEnv.apiBaseUrl}/docs`)
      }
    })

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`)
      httpServer.close(async () => {
        await prisma.$disconnect()
        await redis.quit()
        logger.info('Server closed.')
        process.exit(0)
      })
      // Force shutdown after 30s
      setTimeout(() => process.exit(1), 30000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception:', err)
      process.exit(1)
    })
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

bootstrap()
