'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'

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
  if (diff < 60) return `ha ${diff} min`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `ha ${hours}h`
  return `ha ${Math.floor(hours / 24)}d`
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
        className="relative rounded-lg p-2 text-charcoal-400 transition-colors hover:bg-blush dark:hover:bg-charcoal-700"
        aria-label="Notificacoes"
      >
        <Bell size={18} />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] shadow-xl">
          <div className="border-b border-[#2a2a2a] px-4 py-3">
            <span className="text-sm font-semibold text-[#e5e5e5]">Notificacoes</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#666]">Sem notificacoes operacionais pendentes.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`border-b border-[#2a2a2a] px-4 py-3 last:border-0 ${notification.read ? 'bg-[#1e1e1e]' : 'bg-[#252525]'}`}>
                  <p className="text-sm font-semibold text-[#e5e5e5]">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-[#888]">{notification.desc}</p>
                  <p className="mt-1 text-[10px] text-[#555]">{timeAgo(notification.time)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
