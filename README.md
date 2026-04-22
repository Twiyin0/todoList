# VueTodoList

全栈待办事项 + Markdown 编辑器 + 协同创作，基于 Vue 3 + Express + Turso (libSQL)，可一键部署到 Vercel。

---

## 功能

- 待办事项管理（优先级、标签、提醒、软删除/撤销）
- Markdown 在线编辑器（Vditor，支持图片/视频/音频上传）
- 协同创作（邀请链接 + WebSocket/轮询实时同步 + 光标位置显示）
- API Token 鉴权（外部 API 调用）
- 管理面板（用户管理）
- 亮色/暗色主题

---

## 协同创作

1. 在编辑器页面点击 👥 按钮，生成邀请链接
2. 将链接发给对方（对方需已注册）
3. 对方打开链接，点击「接受邀请」后文档出现在其侧边栏
4. 双方可实时协同编辑，工具栏显示对方光标位置

**同步模式**（`config.yml` 的 `collabMode`）：
- `polling` — 轮询（默认，兼容 Vercel）
- `websocket` — WebSocket 实时同步（仅本地）
- `disabled` — 关闭协同

前端工具栏 🔗 按钮可随时开关协同，状态保存在 `localStorage`。

---

## 外部 API 文档

所有外部 API 路径以 `/api/external` 为前缀，使用 **API Token** 进行鉴权，无需 JWT。

Token 在登录后前往「API Token 管理」页面生成，支持设置过期时间或永不过期。Token 过期后服务端自动删除，需重新生成。

### 鉴权结构

每个请求 Body 中包含：

```json
{
  "auth": {
    "token": "你的 API Token"
  }
}
```

### 通用响应码

| code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 参数缺失或格式错误 |
| 403 | Token 无效或已过期 |
| 404 | 资源不存在 |
| 410 | 撤销窗口已过期 |
| 500 | 服务器内部错误 |

---

### 1. 添加待办 `POST /api/external/todo/add`

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todo": {
    "title": "完成报告",
    "description": "第三季度财务报告",
    "tag": "工作",
    "priority": 1,
    "noticetime": "2025-08-01T09:00:00"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 待办标题 |
| description | string | | 描述 |
| tag | string | | 分类标签（如：工作、生活） |
| priority | number | | 优先级：0=普通 1=重要 2=紧急，默认 0 |
| noticetime | string \| number | | 提醒时间，ISO 8601 字符串或 Unix 时间戳（秒）|

**响应：**

```json
{ "code": 200, "message": "ok!", "todoId": 42 }
```

---

### 2. 删除待办（软删除，可撤销）`POST /api/external/todo/delete`

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todoId": 42,
  "undoKeepTime": 7
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| todoId | number | ✅ | 待办 ID |
| undoKeepTime | number | | 撤销保留天数，默认 7 天 |

**响应：**

```json
{ "code": 200, "message": "ok!", "undoRemainTime": "7day 0hour" }
```

> 软删除后，前端列表不再显示该条目，但数据仍在数据库中保留 `undoKeepTime` 天，可通过撤销接口恢复。超过保留时间后将在下次启动时被永久清除。

---

### 3. 撤销删除 `POST /api/external/todo/undodelete`

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todoId": 42
}
```

**响应（成功撤销）：**

```json
{ "code": 200, "message": "ok!", "undo": "Remain" }
```

**响应（已过期）：**

```json
{ "code": 410, "message": "Undo window expired", "undo": "Expired" }
```

| `undo` 值 | 说明 |
|-----------|------|
| Remain | 撤销成功，待办已恢复 |
| Expired | 撤销窗口已过期，数据无法恢复 |
| NotFound | 找不到该待办（ID 错误或不属于该用户）|

---

### 4. 完成待办 `POST /api/external/todo/complete`

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todoId": 42
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| todoId | number | ✅ | 待办 ID |

**响应（成功）：**

```json
{
  "code": 200,
  "message": "ok!",
  "callback": {
    "id": 42,
    "title": "完成报告",
    "tag": "工作",
    "completed": true,
    "updated_at": 1754002900
  }
}
```

**响应（已经是完成状态）：**

```json
{
  "code": 200,
  "message": "Already completed",
  "callback": { "id": 42, "title": "完成报告", "completed": true }
}
```

---

### 5. 获取待办列表 `POST /api/external/todo/listTodoList`

支持按类型、完成状态、优先级、关键词过滤。

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "filter": {
    "tag": "工作",
    "completed": false,
    "priority": 1,
    "keyword": "报告",
    "includeDeleted": false
  }
}
```

| filter 字段 | 类型 | 说明 |
|-------------|------|------|
| tag | string | 按分类标签筛选 |
| completed | boolean | `true` 只返回已完成，`false` 只返回未完成 |
| priority | number | 按优先级筛选（0/1/2）|
| keyword | string | 标题或描述模糊搜索 |
| includeDeleted | boolean | 是否包含软删除的条目，默认 false |

所有 `filter` 字段均可选，不传 `filter` 则返回全部有效待办。

**响应：**

```json
{
  "code": 200,
  "message": "ok!",
  "total": 2,
  "todos": [
    {
      "id": 42,
      "title": "完成报告",
      "description": "第三季度财务报告",
      "tag": "工作",
      "completed": false,
      "priority": 1,
      "notice_enabled": true,
      "notice_time": 1754002800,
      "created_at": 1753900000,
      "updated_at": 1753900000
    }
  ]
}
```

---

### 6. 获取单条待办详情 `POST /api/external/todo/getTodo`

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todoId": 42
}
```

**响应：**

```json
{ "code": 200, "message": "ok!", "todo": { /* 同上 todo 对象 */ } }
```

---

### 7. 查询待办状态 / 触发客户端提醒 `POST /api/external/todo/todoStatus`

查询指定待办的当前状态。传入 `triggerNotice: true` 时，服务端会把该待办的提醒时间设置为当前时间，前端页面将在 ≤30 秒内的下次轮询时弹出提醒弹窗。

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todoId": 42,
  "triggerNotice": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| todoId | number | ✅ | 待办 ID |
| triggerNotice | boolean | | 传 `true` 立即触发客户端弹窗提醒 |

**响应：**

```json
{
  "code": 200,
  "message": "ok!",
  "status": {
    "id": 42,
    "title": "完成报告",
    "tag": "工作",
    "completed": false,
    "priority": 1,
    "deleted": false,
    "notice_enabled": true,
    "notice_time": 1754002800,
    "notice_triggered": true,
    "state": "active"
  }
}
```

| `state` 值 | 含义 |
|------------|------|
| `active` | 正常进行中 |
| `overdue_notice` | 提醒时间已过但未完成 |
| `completed` | 已完成 |
| `deleted` | 已软删除 |

> **提醒触发原理**：`triggerNotice:true` 将 `notice_time` 写为当前时间，前端每 30 秒轮询 `GET /todos/notifications`，命中后弹出页内弹窗并发送浏览器通知（需用户授权）。

---

### 8. 修改待办字段 `POST /api/external/todo/updateTodo`

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" },
  "todoId": 42,
  "update": {
    "title": "新标题",
    "description": "新描述",
    "tag": "生活",
    "priority": 2,
    "notice_enabled": true,
    "noticetime": "2025-09-01T10:00:00"
  }
}
```

| update 字段 | 类型 | 说明 |
|-------------|------|------|
| title | string | 更新标题 |
| description | string | 更新描述 |
| tag | string | 更新分类标签 |
| priority | number | 更新优先级 0/1/2 |
| notice_enabled | boolean | 开关提醒 |
| noticetime | string \| number | 更新提醒时间，ISO 8601 或 Unix 时间戳（秒）|

所有字段均可选，只传需要修改的字段。

**响应：**

```json
{ "code": 200, "message": "ok!", "todo": { /* 更新后的 todo 对象 */ } }
```

---

### 9. 查询到期提醒 `POST /api/external/todo/notifications`

返回当前用户所有「提醒时间已到且未完成」的待办，供外部客户端轮询后触发提醒。

**请求 Body：**

```json
{
  "auth": { "token": "1_1dkxhiy" }
}
```

**响应：**

```json
{
  "code": 200,
  "message": "ok!",
  "todos": [
    {
      "id": 42,
      "title": "完成报告",
      "description": "第三季度财务报告",
      "tag": "工作",
      "notice_time": 1754002800
    }
  ]
}
```

> 建议外部客户端每 30 秒轮询一次，收到结果后自行记录已处理的 `id`，避免重复触发。

---

## 完整调用示例（curl）

```bash
# 添加待办
curl -X POST https://your-domain.vercel.app/api/external/todo/add \
  -H "Content-Type: application/json" \
  -d '{
    "auth": {"token":"1_1dkxhiy"},
    "todo": {"title":"买牛奶","tag":"生活","noticetime":"2025-08-01T08:00:00"}
  }'

# 删除待办（保留 3 天可撤销）
curl -X POST https://your-domain.vercel.app/api/external/todo/delete \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"todoId":1,"undoKeepTime":3}'

# 撤销删除
curl -X POST https://your-domain.vercel.app/api/external/todo/undodelete \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"todoId":1}'

# 标记完成
curl -X POST https://your-domain.vercel.app/api/external/todo/complete \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"todoId":1}'

# 获取待办列表（按类型筛选未完成）
curl -X POST https://your-domain.vercel.app/api/external/todo/listTodoList \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"filter":{"tag":"工作","completed":false}}'

# 获取单条详情
curl -X POST https://your-domain.vercel.app/api/external/todo/getTodo \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"todoId":1}'

# 查询状态 + 立即触发客户端弹窗提醒
curl -X POST https://your-domain.vercel.app/api/external/todo/todoStatus \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"todoId":1,"triggerNotice":true}'

# 修改待办字段
curl -X POST https://your-domain.vercel.app/api/external/todo/updateTodo \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"},"todoId":1,"update":{"priority":2,"tag":"紧急"}}'

# 查询到期提醒
curl -X POST https://your-domain.vercel.app/api/external/todo/notifications \
  -H "Content-Type: application/json" \
  -d '{"auth":{"token":"1_1dkxhiy"}}'
```

---

## 部署到 Vercel

1. Fork 本仓库，在 [Vercel](https://vercel.com) 导入项目
2. 在 Turso 创建数据库，获取连接信息：[turso.tech](https://turso.tech)
3. 在 Vercel → Settings → Environment Variables 配置以下变量：

| 变量 | 说明 |
|------|------|
| `TURSO_DATABASE_URL` | Turso 数据库 URL，格式 `libsql://xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 认证 Token |
| `JWT_SECRET` | JWT 签名密钥（随机字符串） |
| `ADMIN_PASSWORD` | 管理员密码 MD5 值（默认 `123` 的 MD5）|
| `UPYUN_BUCKET` | 又拍云存储桶名 |
| `UPYUN_OPERATOR` | 又拍云操作员名 |
| `UPYUN_PASSWORD` | 又拍云操作员密码 |
| `UPYUN_DOMAIN` | 又拍云 CDN 域名，如 `https://your.cdn.net` |
| `UPYUN_BASE_PATH` | 文件存储根路径，默认 `/media` |

4. 点击 Deploy，Vercel 自动构建前端并部署 Serverless API

---

## 本地开发

```bash
# 安装依赖
yarn install

# 启动开发服务器（后端 :3300，前端 :5173）
yarn dev
```

本地无需配置 Turso / 又拍云，留空时自动回退为：
- 数据库 → `data/app.db`（本地 SQLite）
- 媒体存储 → `media/` 目录
