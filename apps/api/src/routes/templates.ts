import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'

export const templatesRouter: Router = Router()
templatesRouter.use(authenticate)

// GET /api/v1/templates/lead/:status/:channel
templatesRouter.get('/lead/:status/:channel', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    const status = String(req.params.status)
    const channel = String(req.params.channel)
    const template = await prisma.leadStatusTemplate.findUnique({
      where: { status_channel: { status, channel } },
    })
    res.json({ success: true, data: template ?? null })
  } catch (error) {
    next(error)
  }
})

// PUT /api/v1/templates/lead/:status/:channel
templatesRouter.put('/lead/:status/:channel', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    if (!req.user?.sub) throw new AppError(401, 'Authentication required')
    const status = String(req.params.status)
    const channel = String(req.params.channel)
    const { subject, body } = req.body as { subject?: string; body: string }
    if (!body) throw new AppError(400, 'body is required')
    const template = await prisma.leadStatusTemplate.upsert({
      where: { status_channel: { status, channel } },
      create: { status, channel, subject, body },
      update: { subject, body },
    })
    res.json({ success: true, data: template })
  } catch (error) {
    next(error)
  }
})
