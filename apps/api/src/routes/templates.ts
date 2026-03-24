import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { AppError } from '../middleware/errorHandler'
import { getDefaultTemplate, getDefaultAutoTemplate, DEFAULT_TEMPLATES, DEFAULT_AUTO_TEMPLATES, ORIGIN_TEMPLATES } from '../domain/defaultTemplates'

export const templatesRouter: Router = Router()
templatesRouter.use(authenticate)

// GET /api/v1/templates/lead/:status/:channel
templatesRouter.get('/lead/:status/:channel', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    const status = String(req.params.status)
    const channel = String(req.params.channel)
    const saved = await prisma.leadStatusTemplate.findUnique({
      where: { status_channel: { status, channel } },
    })
    if (saved) {
      res.json({ success: true, data: saved })
      return
    }
    const fallback = getDefaultTemplate(status, channel)
    res.json({ success: true, data: fallback ? { status, channel, subject: fallback.subject, body: fallback.body, isDefault: true } : null })
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

// GET /api/v1/templates/defaults — all default templates for reference
templatesRouter.get('/defaults', authorizePermission('leads.broadcast'), async (_req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        statuses: DEFAULT_TEMPLATES,
        origins: ORIGIN_TEMPLATES,
        auto: DEFAULT_AUTO_TEMPLATES,
      },
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/v1/templates/auto/:templateId
templatesRouter.get('/auto/:templateId', authorizePermission('leads.broadcast'), async (req, res, next) => {
  try {
    const templateId = String(req.params.templateId)
    const saved = await prisma.autoTemplate.findUnique({
      where: { templateId },
    })
    if (saved) {
      res.json({ success: true, data: saved })
      return
    }
    const fallback = getDefaultAutoTemplate(templateId)
    res.json({ success: true, data: fallback ? { templateId, ...fallback, isDefault: true } : null })
  } catch (error) {
    next(error)
  }
})
