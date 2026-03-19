import fs from 'fs/promises'
import path from 'path'
import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { apiEnv } from '../lib/env'

type StorageMode = 'local' | 's3'

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client
  }

  if (apiEnv.storageDriver !== 's3' || !apiEnv.s3) {
    throw new Error('S3 storage is not configured')
  }

  s3Client = new S3Client({
    region: apiEnv.s3.region,
    endpoint: apiEnv.s3.endpoint,
    forcePathStyle: apiEnv.s3.forcePathStyle,
    credentials: {
      accessKeyId: apiEnv.s3.accessKeyId,
      secretAccessKey: apiEnv.s3.secretAccessKey,
    },
  })

  return s3Client
}

function buildStorageKey(filename: string): string {
  if (apiEnv.storageDriver !== 's3' || !apiEnv.s3?.prefix) {
    return filename
  }

  return path.posix.join(apiEnv.s3.prefix, filename)
}

export function getUploadStorageMode(): StorageMode {
  return apiEnv.storageDriver
}

export function buildUploadUrl(filename: string): string {
  if (apiEnv.storageDriver === 'local') {
    return `${apiEnv.apiBaseUrl}/uploads/${filename}`
  }

  return `${apiEnv.uploadPublicBaseUrl}/${filename}`
}

export async function ensureUploadStorageReady(): Promise<void> {
  if (apiEnv.storageDriver === 'local') {
    await fs.mkdir(path.resolve(apiEnv.uploadDir), { recursive: true })
    return
  }

  const client = getS3Client()
  await client.send(new HeadBucketCommand({ Bucket: apiEnv.s3!.bucket }))
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

  const client = getS3Client()
  await client.send(new PutObjectCommand({
    Bucket: apiEnv.s3!.bucket,
    Key: buildStorageKey(params.filename),
    Body: params.buffer,
    ContentType: params.contentType ?? 'application/octet-stream',
  }))

  return buildUploadUrl(params.filename)
}

export async function deleteFile(filename: string): Promise<void> {
  if (apiEnv.storageDriver === 'local') {
    const filePath = path.join(path.resolve(apiEnv.uploadDir), filename)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
    return
  }

  const client = getS3Client()
  await client.send(new DeleteObjectCommand({
    Bucket: apiEnv.s3!.bucket,
    Key: buildStorageKey(filename),
  }))
}

export async function healthcheckUploadStorage(): Promise<boolean> {
  try {
    await ensureUploadStorageReady()
    return true
  } catch {
    return false
  }
}
