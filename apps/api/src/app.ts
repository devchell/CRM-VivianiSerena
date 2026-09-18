import express, { type Express, type Request } from 'express'
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
import { realtimeMutation } from './middleware/realtime'
import { authenticate, authorizePermission } from './middleware/authenticate'

async function getDependencyChecks() {
  const checks: Record<string, boolean> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  try {
    const pong = await redis.ping()
    checks.redis = pong === 'PONG'
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
  const hstsEnabled = process.env.ENABLE_HSTS?.trim().toLowerCase() === 'true'

  const trustProxySetting = process.env.TRUST_PROXY?.trim().toLowerCase()
  app.set('trust proxy', trustProxySetting === 'true' ? 1 : false)
  // Authenticated API responses must not be revalidated into empty 304 bodies.
  // The CRM has its own short-lived read cache and needs the JSON payload on each miss.
  app.disable('etag')

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
    crossOriginResourcePolicy: false,
    hsts: hstsEnabled
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
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

  app.use('/api/', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.use('/api/', rateLimiter)
  app.use(compression())
  app.use(express.json({
    limit: '10mb',
    verify: (req, _res, buffer) => {
      (req as { rawBody?: Buffer }).rawBody = Buffer.from(buffer)
    },
  }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))
  app.use(cookieParser())

  app.use(requestId)

  morgan.token('request-path', (req) => (req as Request).path)
  morgan.token('request-id', (req) => (req as Request).requestId ?? '-')
  app.use(morgan(':remote-addr :method :request-path :status :response-time ms :request-id', {
    stream: { write: (message: string) => logger.http(message.trim()) },
    skip: (req) => req.path.startsWith('/health'),
  }))

  app.use(sqlInjectionDetection)
  app.use(requestLogger)

  if (getUploadStorageMode() === 'local') {
    app.use('/uploads', express.static(apiEnv.uploadDir, {
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      },
    }))
  }

  app.get('/health/live', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'api',
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
      checks: readinessChecks,
    })
  })

  app.get('/health/deps', authenticate, authorizePermission('seguranca.view'), async (_req, res) => {
    const checks = await getDependencyChecks()
    const ready = Object.values(checks).every(Boolean)

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      service: 'api',
      checks,
    })
  })

  app.get('/health', async (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'api',
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
      } catch (error) {
        // Swagger is optional outside the dev flow, but startup issues remain observable.
        logger.warn('Swagger could not be initialized', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })()
  }

  app.use('/api/v1', realtimeMutation)
  app.use('/api/v1', router)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
