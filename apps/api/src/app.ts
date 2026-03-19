import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { rateLimiter } from './middleware/rateLimiter'
import { requestLogger } from './middleware/requestLogger'
import { requestId } from './middleware/requestId'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'
import { sqlInjectionDetection } from './middleware/security'
import { router } from './routes'
import { apiEnv } from './lib/env'
import { logger } from './lib/logger'
import { prisma } from './lib/prisma'
import { redis } from './lib/redis'
import { getUploadStorageMode, healthcheckUploadStorage } from './infrastructure/storage'

async function getDependencyChecks() {
  const checks: Record<string, boolean> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  try {
    await redis.ping()
    checks.redis = true
  } catch {
    checks.redis = false
  }

  checks.uploads = await healthcheckUploadStorage()

  return checks
}

export function createApp(): Express {
  const app = express()
  const appVersion = apiEnv.appVersion
  const environment = apiEnv.nodeEnv
  const allowedOrigins = apiEnv.corsOrigins

  app.set('trust proxy', 1)

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }))

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  }))

  app.use('/api/', rateLimiter)
  app.use(compression())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  app.use(morgan('combined', {
    stream: { write: (message: string) => logger.http(message.trim()) },
    skip: (req) => req.path.startsWith('/health'),
  }))

  app.use(requestId)
  app.use(sqlInjectionDetection)
  app.use(requestLogger)

  if (getUploadStorageMode() === 'local') {
    app.use('/uploads', express.static(apiEnv.uploadDir))
  }

  app.get('/health/live', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'api',
      version: appVersion,
      environment,
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/health/ready', async (_req, res) => {
    const checks = await getDependencyChecks()
    const readinessChecks = {
      database: checks.database,
      redis: checks.redis,
    }
    const ready = Object.values(readinessChecks).every(Boolean)

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      service: 'api',
      version: appVersion,
      environment,
      timestamp: new Date().toISOString(),
      checks: readinessChecks,
    })
  })

  app.get('/health/deps', async (_req, res) => {
    const checks = await getDependencyChecks()
    const ready = Object.values(checks).every(Boolean)

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      service: 'api',
      version: appVersion,
      environment,
      timestamp: new Date().toISOString(),
      checks,
    })
  })

  app.get('/health', async (_req, res) => {
    const checks = await getDependencyChecks()
    const healthy = Object.values(checks).every(Boolean)

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'api',
      version: appVersion,
      environment,
      timestamp: new Date().toISOString(),
      checks,
    })
  })

  if (environment !== 'production') {
    void (async () => {
      try {
        const swaggerJsdoc = (await import('swagger-jsdoc')).default
        const swaggerUi = await import('swagger-ui-express')
        const spec = swaggerJsdoc({
          definition: {
            openapi: '3.0.0',
            info: {
              title: 'Viviani Serena API',
              version: appVersion,
              description: 'CRM and Landing Platform API',
            },
            servers: [{ url: '/api/v1', description: 'API v1' }],
            components: {
              securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
              },
            },
          },
          apis: ['./src/routes/*.ts'],
        })

        app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec))
        logger.info('Swagger docs available at /docs')
      } catch {
        // Swagger is optional outside the dev flow.
      }
    })()
  }

  app.use('/api/v1', router)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
