import type { Server } from 'socket.io'
import { logger } from '../lib/logger'
import { verifyAccessToken } from '../lib/jwt'

export function setupSocketHandlers(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = verifyAccessToken(token)
      socket.data.user = payload
      return next()
    } catch {
      return next(new Error('Invalid token'))
    }
  })

  io.on('connection', socket => {
    const user = socket.data.user
    logger.info('Socket connected', { userId: user?.sub, socketId: socket.id })

    socket.join(`user:${user?.sub}`)

    socket.on('join:dashboard', () => {
      socket.join('dashboard')
      socket.emit('joined:dashboard')
    })

    socket.on('disconnect', reason => {
      logger.info('Socket disconnected', { userId: user?.sub, reason })
    })
  })
}
