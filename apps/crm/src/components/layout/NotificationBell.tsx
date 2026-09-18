'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { crmListShell, crmSoftListItem } from '@/components/ui/listStyles'
import { useRealtimeRefresh } from '@/lib/realtime'

interface Notification {
  id: string
  type: 'lead' | 'appointment' | 'security' | 'financial'
  title: string
  description: string
  timestamp: string
  read: boolean
  readAt?: string | null
}

function timeAgo(date: string): string {
  const timestamp = new Date(date).getTime()
  if (!Number.isFinite(timestamp)) return 'data indisponível'

  const diff = Math.floor((Date.now() - timestamp) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const data = await response.json()
      if (Array.isArray(data)) {
        setNotifications(data as Notification[])
      }
    } catch (error) {
      console.warn('[notifications] Não foi possível carregar as notificações.', error)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  useRealtimeRefresh(loadNotifications)

  useEffect(() => {
    if (!open) return

    void loadNotifications()

    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return

    const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id)

    if (unreadIds.length === 0) {
      return
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
        readAt: notification.readAt ?? new Date().toISOString(),
      }))
    )

    void fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: unreadIds }),
    }).catch(() => null)
  }, [open, notifications])

  const unread = notifications.filter((notification) => !notification.read).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={`${crmListShell} absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden`}>
          <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificações</span>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto p-3">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Sem notificações operacionais pendentes.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`${crmSoftListItem} ${notification.read ? 'opacity-85' : 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30'}`}>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{notification.description}</p>
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(notification.timestamp)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
