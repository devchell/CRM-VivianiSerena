import { Router } from 'express'
import { authRouter } from './auth'
import { leadsRouter } from './leads'
import { appointmentsRouter } from './appointments'
import { financialsRouter } from './financials'
import { contentRouter } from './content'
import { dashboardRouter } from './dashboard'
import { metricsRouter } from './metrics'
import { analyticsRouter } from './analytics'
import { securityRouter } from './security'
import { privacyRouter } from './privacy'
import { usersRouter } from './users'
import { notificationsRouter } from './notifications'

export const router: Router = Router()

router.use('/auth', authRouter)
router.use('/users', usersRouter)
router.use('/leads', leadsRouter)
router.use('/appointments', appointmentsRouter)
router.use('/financials', financialsRouter)
router.use('/content', contentRouter)
router.use('/dashboard', dashboardRouter)
router.use('/metrics', metricsRouter)
router.use('/analytics', analyticsRouter)
router.use('/notifications', notificationsRouter)
router.use('/security', securityRouter)
router.use('/privacy', privacyRouter)
