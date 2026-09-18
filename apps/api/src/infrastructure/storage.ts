import fs from 'fs/promises'
import path from 'path'
import { apiEnv } from '../lib/env'

type StorageMode = 'local'

function safeFilename(filename: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(filename) || filename.includes('..')) {
    throw new Error('Invalid upload filename')
  }
  return filename
}

export function getUploadStorageMode(): StorageMode {
  return 'local'
}

export function buildUploadUrl(filename: string): string {
  return `${apiEnv.apiBaseUrl}/uploads/${safeFilename(filename)}`
}

export async function ensureUploadStorageReady(): Promise<void> {
  await fs.mkdir(path.resolve(apiEnv.uploadDir), { recursive: true })
}

async function ensurePrivateUploadStorageReady(): Promise<void> {
  await fs.mkdir(path.resolve(apiEnv.privateUploadDir), { recursive: true })
}

export async function uploadFile(params: {
  filename: string
  buffer: Buffer
  contentType?: string
}): Promise<string> {
  const filename = safeFilename(params.filename)
  await ensureUploadStorageReady()
  const filePath = path.join(path.resolve(apiEnv.uploadDir), filename)
  await fs.writeFile(filePath, params.buffer, { flag: 'wx' })
  return buildUploadUrl(filename)
}

export async function deleteFile(filename: string): Promise<void> {
  const safe = safeFilename(filename)
  const filePath = path.join(path.resolve(apiEnv.uploadDir), safe)
  try {
    await fs.unlink(filePath)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error
    }
  }
}

export async function readUploadFile(filename: string): Promise<Buffer> {
  const safe = safeFilename(filename)
  await ensureUploadStorageReady()
  return fs.readFile(path.join(path.resolve(apiEnv.uploadDir), safe))
}

export async function uploadPrivateFile(params: { filename: string; buffer: Buffer }): Promise<void> {
  const filename = safeFilename(params.filename)
  await ensurePrivateUploadStorageReady()
  await fs.writeFile(path.join(path.resolve(apiEnv.privateUploadDir), filename), params.buffer, { flag: 'wx' })
}

export async function readPrivateUploadFile(filename: string): Promise<Buffer> {
  const safe = safeFilename(filename)
  await ensurePrivateUploadStorageReady()
  return fs.readFile(path.join(path.resolve(apiEnv.privateUploadDir), safe))
}

export async function deletePrivateFile(filename: string): Promise<void> {
  const safe = safeFilename(filename)
  const filePath = path.join(path.resolve(apiEnv.privateUploadDir), safe)
  try {
    await fs.unlink(filePath)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }
}

export async function healthcheckUploadStorage(): Promise<boolean> {
  try {
    await ensureUploadStorageReady()
    await ensurePrivateUploadStorageReady()
    return true
  } catch {
    return false
  }
}
