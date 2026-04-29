# 双人聊天移动端 App

当前项目已完成 `chat_app_codex_execution_min_loop.md` 的 Step 1 到 Step 12，对应一个可运行的最小闭环：

- 两个固定用户 ID
- 可建立单向绑定
- 可发送文本消息
- 消息写入数据库
- 接收方可通过轮询拿到新消息
- 页面默认展示最近 10 条消息
- 刷新后历史消息仍可重建

## 当前范围

- client-app：移动端单页 Web 聊天界面入口
- server：后端服务入口
- database：数据库 schema 与 migration 目录
- docs：系统骨架说明目录

暂未实现图片、表情、通知、分页、30 天清理、登录态、会话列表。

## 运行环境

- Node.js 18 或更高版本

## 当前固定用户 ID

前端开发配置中的当前用户固定为：

```text
user_a
```

对方用户 ID 通过页面中的绑定输入框输入。

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

## 启动后端

```bash
npm run dev:server
```

默认地址：

```text
http://127.0.0.1:3000
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

当前最小数据模型只包含：

- Binding：单向绑定关系
- Message：双人文本消息

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
- `GET /messages/conversation`
- `GET /messages/poll`

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

4. 在页面中输入对方 ID，例如：

```text
user_b
```

5. 点击“建立绑定”

预期：

- 页面显示绑定成功或已存在绑定
- 顶部状态变为已绑定
- 消息区开始加载最近 10 条历史消息

6. 在输入框中发送一条文本消息

预期：

- 输入框被清空
- 新消息立即追加到当前列表底部

7. 刷新页面

预期：

- 页面恢复上次绑定的目标用户
- 历史消息重新加载

## 最小接口验证

### 1. 建立绑定

```bash
curl -s -X POST http://127.0.0.1:3000/bindings \
  -H 'Content-Type: application/json' \
  -d '{"ownerId":"user_a","targetId":"user_b"}'
```

### 2. 发送文本消息

```bash
curl -s -X POST http://127.0.0.1:3000/messages/text \
  -H 'Content-Type: application/json' \
  -d '{"senderId":"user_a","receiverId":"user_b","text":"hello"}'
```

### 3. 查询最近消息

```bash
curl -s 'http://127.0.0.1:3000/messages/conversation?userA=user_a&userB=user_b&limit=10'
```

### 4. 轮询新消息

```bash
curl -s 'http://127.0.0.1:3000/messages/poll?receiverId=user_b&since=2000-01-01%2000:00:00.000'
```
