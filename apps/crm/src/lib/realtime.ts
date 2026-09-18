'use client'

import { useEffect, useRef } from 'react'

export const REALTIME_EVENT = 'viviani:data-changed'

export interface RealtimeDataEvent {
  resource: string
  method: string
  at: string
}

function parseRealtimeEvent(value: unknown): RealtimeDataEvent | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  if (typeof record.resource !== 'string' || typeof record.method !== 'string' || typeof record.at !== 'string') {
    return null
  }

  return {
    resource: record.resource,
    method: record.method,
    at: record.at,
  }
}

export function useRealtimeRefresh(
  callback: () => void | Promise<void>,
  resources?: readonly string[]
) {
  const callbackRef = useRef(callback)
  const resourceKey = resources && resources.length > 0 ? [...resources].sort().join('|') : '*'

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const allowedResources = resourceKey === '*' ? null : new Set(resourceKey.split('|'))
    const handleDataChanged = (event: Event) => {
      const detail = parseRealtimeEvent((event as CustomEvent<unknown>).detail)
      if (!detail || (allowedResources && detail.resource !== '*' && !allowedResources.has(detail.resource))) return

      void Promise.resolve(callbackRef.current()).catch((error: unknown) => {
        console.warn('[realtime] Não foi possível atualizar os dados.', error)
      })
    }

    window.addEventListener(REALTIME_EVENT, handleDataChanged)
    return () => window.removeEventListener(REALTIME_EVENT, handleDataChanged)
  }, [resourceKey])
}

export function parseRealtimePayload(value: unknown): RealtimeDataEvent | null {
  return parseRealtimeEvent(value)
}
