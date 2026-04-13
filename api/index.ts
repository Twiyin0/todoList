import 'dotenv/config'
import { createApp } from '../server/src/app'
import { runMigrations } from '../server/src/database/migrations'

const app = createApp()

// Run migrations once on cold start; Promise is cached for warm invocations
const ready = runMigrations().catch(err => {
  console.error('[vercel] Migration failed:', err)
  throw err
})

export default async function handler(req: any, res: any) {
  await ready
  return new Promise<void>((resolve, reject) => {
    res.on('finish', resolve)
    res.on('error', reject)
    app(req, res)
  })
}
