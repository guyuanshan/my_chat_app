# 双人聊天移动端 App

当前项目已完成 `chat_app_codex_execution_min_loop.md` 的 Step 1 到 Step 12，对应一个可运行的最小闭环：

- 两个固定用户 ID
- 可建立单向绑定
- 可发送文本消息
- 可发送图片消息
- 可发送表情消息
- 图片发送前支持前端自动压缩
- 消息写入数据库
- 接收方可通过轮询拿到新消息
- 页面默认展示最近 10 条消息
- 历史消息支持分页加载更多
- 当前会话已支持页内通知
- 服务端已支持 30 天老消息定时清理
- 刷新后历史消息仍可重建

## 当前范围

- client-app：移动端单页 Web 聊天界面入口
- server：后端服务入口
- database：数据库 schema 与 migration 目录
- docs：系统骨架说明目录

暂未实现会话列表、已读回执、撤回、系统推送等完整版能力。

## 运行环境

- Node.js 18 或更高版本

## 当前登录方式

当前版本已接入最小登录态，使用固定开发账号：

```text
user_a / pass_user_a
user_b / pass_user_b
```

登录成功后，前端再通过绑定输入框填写对方用户 ID。

## 安装与检查

当前项目不依赖额外 npm 包，直接运行即可。

语法检查：

```bash
npm run check
```

## 启动前端

```bash
npm run dev:client
```

默认地址：

```text
http://127.0.0.1:5173
```

局域网访问示例：

```bash
CLIENT_HOST=0.0.0.0 npm run dev:client
```

前端现在会按以下顺序决定 API 地址：

1. 先读取运行时注入的 `globalThis.__CHAT_APP_CONFIG__.apiBaseUrl`
2. 若未注入，则按当前页面主机名自动推导为 `http(s)://当前主机:3000`
3. 若仍无法推导，再回退到 `http://127.0.0.1:3000`

如果需要手动指定后端地址，可直接在启动前端时注入：

```bash
CLIENT_API_BASE_URL=http://192.168.1.20:3000 npm run dev:client
```

## 启动后端

```bash
npm run dev:server
```

默认地址：

```text
http://127.0.0.1:3000
```

局域网访问示例：

```bash
SERVER_HOST=0.0.0.0 npm run dev:server
```

如果前端和后端不再同源，后端可通过下面变量放开允许来源：

```bash
CORS_ALLOW_ORIGIN=* npm run dev:server
```

健康检查：

```text
GET http://127.0.0.1:3000/health
```

## 数据库

数据库 schema 与 migration 位于：

```text
database/schema/
database/migrations/
```

当前最小数据模型包含：

- Binding：单向绑定关系
- Message：双人文本 / 图片 / 表情消息

conversationId 规则见：

```text
docs/data-model.md
```

默认 SQLite 数据库文件：

```text
database/app.db
```

## 当前已实现接口

### 绑定

- `POST /bindings`
- `GET /bindings/:ownerId/:targetId`

### 消息

- `POST /messages/text`
- `POST /messages/image`
- `POST /messages/emoji`
- `GET /messages/conversation`
- `GET /messages/poll`

说明：

- `GET /messages/conversation` 当前已支持分页参数 `cursor`
- 返回体包含 `items`、`nextCursor`、`hasMore`

## 当前安全与校验规则

- 访问绑定、发消息、查消息、轮询接口前，必须先登录
- 服务端通过 Bearer token 推导当前用户，不再只信任请求里的 `userId`
- 发送文本消息前，要求 `senderId -> receiverId` 已存在绑定
- 发送图片和表情消息前，同样要求 `senderId -> receiverId` 已存在绑定
- `userId` 相关字段最大长度为 `64`
- `text` 最大长度为 `1000`
- `emoji` 最大长度为 `16`
- `imageData` 最大长度为 `350 KB` 字符串
- `GET /messages/conversation` 的 `limit` 最大为 `100`
- 文本与表情请求体最大为 `16 KB`
- 图片请求体最大为 `512 KB`
- 前端会在发送图片前自动缩放并压缩，目标体积约为 `220 KB`
- 服务端会在启动后执行 30 天消息清理，并按固定间隔继续清理

## 当前已知限制

- 当前只支持固定开发账号
- 会话保存在服务端进程内存中，服务重启后需要重新登录
- 当前仍未切到相对路径 `/api` 和反向代理方案，跨环境部署时还需要显式管理前后端地址
- 完整限制见 [limited.md](/Users/sweet_77/Documents/New%20project/limited.md)

## 最小手工验证

1. 启动后端

```bash
npm run dev:server
```

2. 启动前端

```bash
npm run dev:client
```

3. 打开前端页面

```text
http://127.0.0.1:5173
```

4. 先登录，例如：

```text
user_a / pass_user_a
```

5. 在页面中输入对方 ID，例如：

```text
user_b
```

6. 点击“建立绑定”

预期：

- 页面显示绑定成功或已存在绑定
- 顶部状态变为已绑定
- 消息区开始加载最近 10 条历史消息

7. 在输入框中发送一条文本消息，或点击快捷区发送表情 / 选择图片

预期：

- 输入框被清空
- 新消息立即追加到当前列表底部
- 图片消息会显示图片预览
- 表情消息会以独立表情样式展示
- 选择较大的图片时，页面会先提示正在压缩，再发送

8. 刷新页面

预期：

- 页面恢复上次绑定的目标用户
- 历史消息重新加载

9. 点击“加载更多消息”

预期：

- 可继续看到更早的历史消息
- 没有更多消息时按钮会变为不可用

10. 让对方发送一条新消息

预期：

- 当前页面会出现页内通知
- 如果页面处于后台，标题会显示未读计数

## 局域网最小验证

1. 在服务端机器上启动后端：

```bash
SERVER_HOST=0.0.0.0 CORS_ALLOW_ORIGIN=* npm run dev:server
```

2. 在同一台机器上启动前端：

```bash
CLIENT_HOST=0.0.0.0 npm run dev:client
```

3. 在局域网另一台设备访问：

```text
http://<服务端机器局域网 IP>:5173
```

预期：

- 前端会自动把 API 地址推导为 `http://<服务端机器局域网 IP>:3000`
- 登录、绑定、发消息、轮询收消息都能正常工作

## 最小接口验证

### 1. 建立绑定

先登录获取 token：

```bash
curl -s -X POST http://127.0.0.1:3000/session/login \
  -H 'Content-Type: application/json' \
  -d '{"userId":"user_a","password":"pass_user_a"}'
```

再把返回的 token 带入下面请求。

### 2. 建立绑定

```bash
curl -s -X POST http://127.0.0.1:3000/bindings \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"ownerId":"user_a","targetId":"user_b"}'
```

### 3. 发送文本消息

```bash
curl -s -X POST http://127.0.0.1:3000/messages/text \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"senderId":"user_a","receiverId":"user_b","text":"hello"}'
```

### 4. 发送表情消息

```bash
curl -s -X POST http://127.0.0.1:3000/messages/emoji \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"senderId":"user_a","receiverId":"user_b","emoji":"😀"}'
```

### 5. 发送图片消息

```bash
curl -s -X POST http://127.0.0.1:3000/messages/image \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"senderId":"user_a","receiverId":"user_b","imageData":"data:image/png;base64,<base64>"}'
```

说明：

- 浏览器端图片发送已支持自动压缩
- 建议优先通过前端页面验证图片发送链路，而不是手工拼接大体积 base64

### 6. 查询最近消息

```bash
curl -s 'http://127.0.0.1:3000/messages/conversation?userA=user_a&userB=user_b&limit=10' \
  -H 'Authorization: Bearer <token>'
```

### 7. 查询更早一页历史

先取第一页响应里的 `nextCursor`，再带入下一次请求：

```bash
curl -s 'http://127.0.0.1:3000/messages/conversation?userA=user_a&userB=user_b&limit=10&cursor=<nextCursor>' \
  -H 'Authorization: Bearer <token>'
```

### 8. 轮询新消息

```bash
curl -s 'http://127.0.0.1:3000/messages/poll?receiverId=user_b&since=2000-01-01%2000:00:00.000' \
  -H 'Authorization: Bearer <token>'
```

## 常见失败示例

### 1. 未绑定直接发送

```bash
curl -s -X POST http://127.0.0.1:3000/messages/text \
  -H 'Content-Type: application/json' \
  -d '{"senderId":"user_a","receiverId":"never_bound_target","text":"hello"}'
```

预期返回：

```json
{"ok":false,"error":{"code":"BINDING_REQUIRED","message":"senderId must bind receiverId before sending messages."}}
```

### 2. 文本过长

预期返回：

```json
{"ok":false,"error":{"code":"INVALID_TEXT_MESSAGE_INPUT","message":"text must be at most 1000 characters."}}
```

### 3. 请求体过大

预期状态码：

```text
413
```

预期返回：

```json
{"ok":false,"error":{"code":"REQUEST_BODY_TOO_LARGE","message":"Request body must be at most 16 KB."}}
```

### 4. 图片数据不合法

预期返回：

```json
{"ok":false,"error":{"code":"INVALID_IMAGE_MESSAGE_INPUT","message":"imageData must be a valid image data URL."}}
```

### 5. 图片压缩后仍然过大

前端预期提示：

```text
图片压缩后仍然过大，请换一张更小的图片。
```
