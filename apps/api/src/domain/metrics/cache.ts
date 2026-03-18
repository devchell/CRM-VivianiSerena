import { deletePattern } from '../../lib/redis'

export async function invalidateOperationalMetricCaches(): Promise<void> {
  await Promise.all([
    deletePattern('dashboard:*'),
    deletePattern('metrics:*'),
    deletePattern('financial:*'),
    deletePattern('analytics:*'),
  ])
}
