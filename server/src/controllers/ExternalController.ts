import { Request, Response } from 'express'
import { User } from '../models/User'
import { Todo } from '../models/Todo'
import { ApiToken } from '../models/ApiToken'

async function verifyAuth(auth: { token?: string }): Promise<User | null> {
  if (!auth?.token) return null
  const apiToken = await ApiToken.findByToken(auth.token)
  if (!apiToken) return null
  return User.findById(apiToken.user_id)
}

function undoRemainTime(deletedAt: number, keepDays: number): string {
  const expiresAt = deletedAt + keepDays * 86400
  const remaining = expiresAt - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return '0day 0hour'
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  return `${days}day ${hours}hour`
}

function todoToPublic(t: Todo) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    tag: t.tag,
    completed: t.completed,
    priority: t.priority,
    notice_enabled: t.notice_enabled,
    notice_time: t.notice_time,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }
}

export class ExternalController {
  /** POST /api/external/todo/add */
  static async addTodo(req: Request, res: Response): Promise<void> {
    const { auth, todo } = req.body
    if (!auth || !todo) {
      res.json({ code: 400, message: 'Missing auth or todo' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    if (!todo.title) {
      res.json({ code: 400, message: 'title is required' }); return
    }

    let noticeTime: number | undefined
    if (todo.noticetime) {
      const ts = typeof todo.noticetime === 'number'
        ? todo.noticetime
        : Math.floor(new Date(todo.noticetime).getTime() / 1000)
      if (isNaN(ts)) {
        res.json({ code: 400, message: 'Invalid noticetime format' }); return
      }
      noticeTime = ts
    }

    try {
      const created = await Todo.create(
        user.id,
        todo.title,
        todo.description,
        todo.priority ?? 0,
        todo.tag,
        !!noticeTime,
        noticeTime
      )
      res.json({ code: 200, message: 'ok!', todoId: created.id })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/delete */
  static async deleteTodo(req: Request, res: Response): Promise<void> {
    const { auth, todoId, undoKeepTime } = req.body
    if (!auth || !todoId) {
      res.json({ code: 400, message: 'Missing auth or todoId' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    const keepDays = typeof undoKeepTime === 'number' ? undoKeepTime : 7
    try {
      const todo = await Todo.softDelete(Number(todoId), user.id, keepDays)
      if (!todo) {
        res.json({ code: 404, message: 'Todo not found or already deleted' }); return
      }
      res.json({ code: 200, message: 'ok!', undoRemainTime: undoRemainTime(todo.deleted_at!, todo.undo_keep_days) })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/undodelete */
  static async undoDelete(req: Request, res: Response): Promise<void> {
    const { auth, todoId } = req.body
    if (!auth || !todoId) {
      res.json({ code: 400, message: 'Missing auth or todoId' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      const { status } = await Todo.restore(Number(todoId), user.id)
      if (status === 'NotFound') {
        res.json({ code: 404, message: 'Todo not found', undo: 'NotFound' }); return
      }
      res.json({
        code: status === 'Remain' ? 200 : 410,
        message: status === 'Remain' ? 'ok!' : 'Undo window expired',
        undo: status,
      })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/complete */
  static async completeTodo(req: Request, res: Response): Promise<void> {
    const { auth, todoId } = req.body
    if (!auth || !todoId) {
      res.json({ code: 400, message: 'Missing auth or todoId' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      const todo = await Todo.findById(Number(todoId))
      if (!todo || todo.user_id !== user.id || todo.deleted_at !== null) {
        res.json({ code: 404, message: 'Todo not found' }); return
      }
      if (todo.completed) {
        res.json({
          code: 200,
          message: 'Already completed',
          callback: { id: todo.id, title: todo.title, completed: true },
        }); return
      }
      const updated = await Todo.update(Number(todoId), user.id, { completed: true })
      res.json({
        code: 200,
        message: 'ok!',
        callback: todoToPublic(updated!),
      })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/listTodoList */
  static async listTodoList(req: Request, res: Response): Promise<void> {
    const { auth, filter } = req.body
    if (!auth) {
      res.json({ code: 400, message: 'Missing auth' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      const todos = await Todo.findByUserFiltered(user.id, filter ?? {})
      res.json({
        code: 200,
        message: 'ok!',
        total: todos.length,
        todos: todos.map(todoToPublic),
      })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/getTodo */
  static async getTodo(req: Request, res: Response): Promise<void> {
    const { auth, todoId } = req.body
    if (!auth || !todoId) {
      res.json({ code: 400, message: 'Missing auth or todoId' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      const todo = await Todo.findById(Number(todoId))
      if (!todo || todo.user_id !== user.id) {
        res.json({ code: 404, message: 'Todo not found' }); return
      }
      res.json({ code: 200, message: 'ok!', todo: todoToPublic(todo) })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /**
   * POST /api/external/todo/todoStatus
   *
   * 查询待办状态。传 triggerNotice:true 时会将该待办的
   * notice_time 设为当前时间，前端下次轮询（≤30s）即触发弹窗提醒。
   */
  static async todoStatus(req: Request, res: Response): Promise<void> {
    const { auth, todoId, triggerNotice } = req.body
    if (!auth || !todoId) {
      res.json({ code: 400, message: 'Missing auth or todoId' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      let todo = await Todo.findById(Number(todoId))
      if (!todo || todo.user_id !== user.id) {
        res.json({ code: 404, message: 'Todo not found' }); return
      }

      // Trigger client-side notice: set notice_time = now so the frontend polling picks it up
      if (triggerNotice && !todo.completed && !todo.deleted_at) {
        todo = (await Todo.update(Number(todoId), user.id, {
          notice_enabled: true,
          notice_time: Math.floor(Date.now() / 1000),
        })) ?? todo
      }

      const now = Math.floor(Date.now() / 1000)
      res.json({
        code: 200,
        message: 'ok!',
        status: {
          id: todo.id,
          title: todo.title,
          tag: todo.tag,
          completed: todo.completed,
          priority: todo.priority,
          deleted: todo.deleted_at !== null,
          notice_enabled: todo.notice_enabled,
          notice_time: todo.notice_time,
          notice_triggered: triggerNotice === true && !todo.completed && !todo.deleted_at,
          // Human-readable summary
          state: todo.deleted_at
            ? 'deleted'
            : todo.completed
              ? 'completed'
              : (todo.notice_time && todo.notice_time <= now ? 'overdue_notice' : 'active'),
        },
      })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/updateTodo */
  static async updateTodo(req: Request, res: Response): Promise<void> {
    const { auth, todoId, update } = req.body
    if (!auth || !todoId || !update) {
      res.json({ code: 400, message: 'Missing auth, todoId, or update' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      const todo = await Todo.findById(Number(todoId))
      if (!todo || todo.user_id !== user.id || todo.deleted_at !== null) {
        res.json({ code: 404, message: 'Todo not found' }); return
      }

      let noticeTime: number | undefined
      if (update.noticetime !== undefined) {
        if (update.noticetime === null) {
          noticeTime = undefined
        } else {
          const ts = typeof update.noticetime === 'number'
            ? update.noticetime
            : Math.floor(new Date(update.noticetime).getTime() / 1000)
          if (isNaN(ts)) {
            res.json({ code: 400, message: 'Invalid noticetime format' }); return
          }
          noticeTime = ts
        }
      }

      const updated = await Todo.update(Number(todoId), user.id, {
        ...(update.title !== undefined && { title: update.title }),
        ...(update.description !== undefined && { description: update.description }),
        ...(update.tag !== undefined && { tag: update.tag }),
        ...(update.priority !== undefined && { priority: update.priority }),
        ...(update.notice_enabled !== undefined && { notice_enabled: !!update.notice_enabled }),
        ...(noticeTime !== undefined && { notice_time: noticeTime }),
      })
      res.json({ code: 200, message: 'ok!', todo: todoToPublic(updated!) })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }

  /** POST /api/external/todo/notifications — pending notice todos for a user */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    const { auth } = req.body
    if (!auth) {
      res.json({ code: 400, message: 'Missing auth' }); return
    }
    const user = await verifyAuth(auth)
    if (!user) {
      res.json({ code: 403, message: 'Invalid credentials' }); return
    }
    try {
      const todos = await Todo.findPendingNotifications(user.id)
      res.json({
        code: 200,
        message: 'ok!',
        todos: todos.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          tag: t.tag,
          notice_time: t.notice_time,
        })),
      })
    } catch (err: any) {
      res.json({ code: 500, message: err.message })
    }
  }
}
