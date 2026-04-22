import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage, Server } from 'http'
import jwt from 'jsonwebtoken'
import { Document } from '../models/Document'

interface Client {
  ws: WebSocket
  userId: number
  username: string
  docId: number
}

const rooms = new Map<number, Set<Client>>() // docId → clients

function getRoom(docId: number): Set<Client> {
  if (!rooms.has(docId)) rooms.set(docId, new Set())
  return rooms.get(docId)!
}

function broadcast(docId: number, data: object, excludeUserId?: number) {
  const room = rooms.get(docId)
  if (!room) return
  const msg = JSON.stringify(data)
  for (const client of room) {
    if (excludeUserId !== undefined && client.userId === excludeUserId) continue
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(msg)
  }
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://localhost`)
    const token = url.searchParams.get('token')
    const docId = parseInt(url.searchParams.get('docId') ?? '')

    if (!token || isNaN(docId)) { ws.close(4001, 'Missing token or docId'); return }

    let userId: number
    let username: string
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET ?? 'vue-todo-secret-key-2024') as any
      userId = payload.userId
      username = payload.username ?? String(userId)
    } catch {
      ws.close(4001, 'Invalid token'); return
    }

    const canAccess = await Document.canAccess(docId, userId)
    if (!canAccess) { ws.close(4003, 'Forbidden'); return }

    const client: Client = { ws, userId, username, docId }
    getRoom(docId).add(client)

    // Send current doc content on join
    const doc = await Document.findById(docId)
    if (doc) ws.send(JSON.stringify({ type: 'init', content: doc.content, title: doc.title, updated_at: doc.updated_at }))

    ws.on('message', async (raw) => {
      let msg: any
      try { msg = JSON.parse(raw.toString()) } catch { return }

      if (msg.type === 'update' && typeof msg.content === 'string') {
        await Document.update(docId, userId, { content: msg.content })
        broadcast(docId, { type: 'update', content: msg.content, userId }, userId)
      } else if (msg.type === 'cursor' && msg.line !== undefined) {
        broadcast(docId, { type: 'cursor', userId, username: client.username, line: msg.line, col: msg.col }, userId)
      }
    })

    ws.on('close', () => {
      getRoom(docId).delete(client)
      if (getRoom(docId).size === 0) rooms.delete(docId)
    })
  })

  return wss
}
