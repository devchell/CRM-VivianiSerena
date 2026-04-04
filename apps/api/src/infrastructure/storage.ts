import fs from 'fs/promises'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { apiEnv } from '../lib/env'

type StorageMode = 'local' | 'supabase'

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const cfg = apiEnv.supabaseStorage
  if (!cfg) throw new Error('Supabase storage is not configured')

  supabaseClient = createClient(cfg.url, cfg.serviceRoleKey, {
    auth: { persistSession: false },
  })
  return supabaseClient
}

export function getUploadStorageMode(): StorageMode {
  return apiEnv.storageDriver
}

export function buildUploadUrl(filename: string): string {
  if (apiEnv.storageDriver === 'local') {
    return `${apiEnv.apiBaseUrl}/uploads/${filename}`
  }

  const cfg = apiEnv.supabaseStorage!
  const client = getSupabaseClient()
  const { data } = client.storage.from(cfg.bucket).getPublicUrl(filename)
  return data.publicUrl
}

export async function ensureUploadStorageReady(): Promise<void> {
  if (apiEnv.storageDriver === 'local') {
    await fs.mkdir(path.resolve(apiEnv.uploadDir), { recursive: true })
    return
  }

  const cfg = apiEnv.supabaseStorage!
  const client = getSupabaseClient()

  // Create bucket if it doesn't exist (idempotent)
  const { error: createError } = await client.storage.createBucket(cfg.bucket, {
    public: true,
    allowedMimeTypes: ['image/*', 'application/pdf', 'video/*'],
    fileSizeLimit: 52428800, // 50 MB
  })

  // Ignore "already exists" error
  if (createError && !createError.message.includes('already exists') && !createError.message.includes('Duplicate')) {
    throw new Error(`Failed to ensure Supabase bucket: ${createError.message}`)
  }
}

export async function uploadFile(params: {
  filename: string
  buffer: Buffer
  contentType?: string
}): Promise<string> {
  if (apiEnv.storageDriver === 'local') {
    await ensureUploadStorageReady()
    const filePath = path.join(path.resolve(apiEnv.uploadDir), params.filename)
    await fs.writeFile(filePath, params.buffer)
    return buildUploadUrl(params.filename)
  }

  const cfg = apiEnv.supabaseStorage!
  const client = getSupabaseClient()

  const { error } = await client.storage.from(cfg.bucket).upload(params.filename, params.buffer, {
    contentType: params.contentType ?? 'application/octet-stream',
    upsert: true,
  })

  if (error) throw new Error(`Supabase upload failed: ${error.message}`)

  return buildUploadUrl(params.filename)
}

export async function deleteFile(filename: string): Promise<void> {
  if (apiEnv.storageDriver === 'local') {
    const filePath = path.join(path.resolve(apiEnv.uploadDir), filename)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    return
  }

  const cfg = apiEnv.supabaseStorage!
  const client = getSupabaseClient()

  const { error } = await client.storage.from(cfg.bucket).remove([filename])
  if (error) throw new Error(`Supabase delete failed: ${error.message}`)
}

export async function healthcheckUploadStorage(): Promise<boolean> {
  try {
    if (apiEnv.storageDriver === 'local') {
      await fs.mkdir(path.resolve(apiEnv.uploadDir), { recursive: true })
      return true
    }

    const cfg = apiEnv.supabaseStorage!
    const client = getSupabaseClient()
    const { error } = await client.storage.from(cfg.bucket).list('', { limit: 1 })
    return !error
  } catch {
    return false
  }
}
