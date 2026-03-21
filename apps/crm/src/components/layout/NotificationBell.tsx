'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { crmListShell, crmSoftListItem } from '@/components/ui/listStyles'

interface Notification {
  id: string
  type: 'lead' | 'appointment' | 'security' | 'financial'
  title: string
  desc: string
  time: string
  read: boolean
  readAt?: string | null
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
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
    } catch {
      return null
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

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
        className="relative rounded-lg p-2 text-charcoal-400 transition-colors hover:bg-blush dark:hover:bg-[#252423]"
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
          <div className="border-b border-blush-200 bg-[linear-gradient(135deg,rgba(255,251,247,0.98),rgba(255,244,236,0.94))] px-4 py-3 dark:border-[#3a3835] dark:bg-[linear-gradient(135deg,rgba(29,25,22,0.95),rgba(24,21,19,0.9))]">
            <span className="text-sm font-semibold text-charcoal dark:text-charcoal-100">Notificações</span>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto p-3">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-300">Sem notificações operacionais pendentes.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`${crmSoftListItem} ${notification.read ? 'opacity-85' : 'border-rose-gold/30 bg-rose-gold/5 dark:bg-rose-gold/10'}`}>
                  <p className="text-sm font-semibold text-charcoal dark:text-charcoal-100">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-300">{notification.desc}</p>
                  <p className="mt-1 text-[10px] text-charcoal-400 dark:text-charcoal-300">{timeAgo(notification.time)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
