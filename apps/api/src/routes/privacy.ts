import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate, authorizePermission } from '../middleware/authenticate'
import { EncryptionService } from '../infrastructure/security/EncryptionService'
import { AuditLogger } from '../infrastructure/security/AuditLogger'

export const privacyRouter: Router = Router()
privacyRouter.use(authenticate)
privacyRouter.use(authorizePermission('privacy.manage'))

/**
 * GET /privacy/export?email=xxx
 * LGPD Art. 18 — Exportar todos os dados de uma pessoa
 */
privacyRouter.get('/export', async (req, res, next) => {
  try {
    const email = z.string().email().parse(req.query.email)

    const [lead, consentLogs] = await Promise.all([
      prisma.lead.findFirst({
        where: { email, deletedAt: null },
        include: {
          sessions: { select: { ip: true, userAgent: true, referrer: true, createdAt: true } },
          appointments: { select: { date: true, serviceType: true, status: true, notes: true } },
          clientFolders: {
            select: {
              id: true,
              clientName: true,
              clientEmail: true,
              clientPhone: true,
              serviceLabel: true,
              notes: true,
              isPublished: true,
              createdAt: true,
              media: {
                select: { id: true, stage: true, capturedAt: true, note: true, width: true, height: true },
                orderBy: { capturedAt: 'asc' },
              },
            },
          },
          clients: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              notes: true,
              createdAt: true,
              folders: {
                select: {
                  id: true,
                  name: true,
                  occurredAt: true,
                  notes: true,
                  serviceLabel: true,
                  isPublished: true,
                  media: {
                    select: { id: true, stage: true, capturedAt: true, note: true, width: true, height: true },
                    orderBy: { capturedAt: 'asc' },
                  },
                },
                orderBy: [{ position: 'asc' }, { occurredAt: 'asc' }],
              },
            },
          },
        },
      }),
      prisma.consentLog.findMany({
        where: { email },
        orderBy: { consentedAt: 'desc' },
        select: {
          channel: true,
          policyVersion: true,
          consentText: true,
          consentedAt: true,
          ipAddress: true,
        },
      }),
    ])

    if (!lead) {
      res.status(404).json({ success: false, error: 'Dados não encontrados para este e-mail' })
      return
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: 'Sistema Viviani Serena',
      legalBasis: 'LGPD Art. 18 — Direito de Acesso',
      personalData: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        createdAt: lead.createdAt,
        status: lead.status,
        notes: lead.notes,
        consentedAt: lead.consentedAt,
      },
      consentLogs,
      sessions: lead.sessions.map(s => ({
        ip: s.ip ? s.ip.split('.').slice(0, 3).concat(['xxx']).join('.') : null, // anonymized
        referrer: s.referrer,
        createdAt: s.createdAt,
      })),
      appointments: lead.appointments,
      clientFolders: lead.clientFolders,
      clients: lead.clients,
    }

    // Log this access
    const authReq = req as typeof req & { user?: { sub: string } }
    if (authReq.user?.sub) {
      await AuditLogger.log({
        userId: authReq.user.sub,
        action: 'EXPORT',
        resource: 'Lead',
        details: { email, leadId: lead.id },
        ip: req.ip,
      })
    }

    res.setHeader('Content-Disposition', `attachment; filename="dados-lgpd-${EncryptionService.anonymize(email)}.json"`)
    res.setHeader('Content-Type', 'application/json')
    res.json(exportData)
  } catch (err) { next(err) }
})
