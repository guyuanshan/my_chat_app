# 最小数据模型

当前文件对应 Step 2，只定义最小闭环需要的数据结构与规则，不实现接口逻辑。

## Binding

用于表达“某人绑定某人”的单向关系。

```text
Binding {
  bindingId: string
  ownerId: string
  targetId: string
  status: "active"
  createdAt: datetime
}
```

约束：

- `ownerId` 必填
- `targetId` 必填
- `ownerId` 不能等于 `targetId`
- 同一个 `ownerId -> targetId` 只能存在一条绑定
- `status` 当前只使用 `active`

## Message

用于表达两个固定用户之间的一条消息，当前支持文本、图片和表情。

```text
Message {
  messageId: string
  conversationId: string
  senderId: string
  receiverId: string
  type: "text" | "image" | "emoji"
  text?: string
  imageData?: string
  emoji?: string
  clientMessageId?: string
  sentAt: datetime
  status: "sent"
}
```

约束：

- `senderId` 必填
- `receiverId` 必填
- `senderId` 不能等于 `receiverId`
- `type` 当前支持 `text`、`image`、`emoji`
- `text` 消息必须提供非空 `text`
- `image` 消息必须提供合法图片 data URL 形式的 `imageData`
- `emoji` 消息必须提供非空 `emoji`
- `status` 当前固定为 `sent`
- `clientMessageId` 是预留字段，暂未用于去重

## conversationId 生成规则

conversationId 必须唯一、稳定、可复现。

规则：

1. 取两个用户 ID：`userA`、`userB`
2. 去掉首尾空白
3. 按 Unicode 字典序升序排序
4. 用 `:` 拼接
5. 加上固定前缀 `dm:`

示例：

```text
createConversationId("user_b", "user_a") => "dm:user_a:user_b"
createConversationId("user_a", "user_b") => "dm:user_a:user_b"
```

说明：

- 两个用户 ID 相同不是合法会话
- 当前已接入最小登录态，服务端会校验消息与查询里的用户上下文
- 该规则只用于双人会话，不支持群聊
