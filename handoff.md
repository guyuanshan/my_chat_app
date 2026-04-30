# 交接文档

更新时间：2026-04-30 10:30:00 CST

## 1. 项目当前状态

当前项目是一个可运行的双人聊天最小闭环，已经完成这些能力：

- 最小登录态
- 单向绑定
- 文本消息发送
- 图片消息发送
- 表情消息发送
- 最近 10 条历史消息加载
- 历史消息分页加载更多
- 轮询收消息
- 页内通知
- 30 天老消息定时清理
- 局域网 / 多环境 API 地址配置

前端与后端默认地址：

- 前端：`http://127.0.0.1:5173`
- 后端：`http://127.0.0.1:3000`

固定开发账号：

- `user_a / pass_user_a`
- `user_b / pass_user_b`

## 2. 当前关键实现

### 前端

- 主入口：
  - [client-app/main.js](/Users/sweet_77/Documents/New%20project/client-app/main.js)
- 聊天页：
  - [client-app/pages/chat/render.js](/Users/sweet_77/Documents/New%20project/client-app/pages/chat/render.js)
- 消息列表：
  - [client-app/components/message-list/render.js](/Users/sweet_77/Documents/New%20project/client-app/components/message-list/render.js)
- 快捷操作区：
  - [client-app/components/quick-actions/render.js](/Users/sweet_77/Documents/New%20project/client-app/components/quick-actions/render.js)
- 消息接口：
  - [client-app/services/message/api.js](/Users/sweet_77/Documents/New%20project/client-app/services/message/api.js)

前端当前已经实现：

- 表情分类面板
- 最近使用表情
- 图片前端压缩
- 加载更多历史消息按钮
- 页内通知条
- 页面隐藏时标题未读计数
- 运行时 `apiBaseUrl` 注入
- 按当前访问主机自动推导后端地址

### 后端

- 服务入口：
  - [server/index.mjs](/Users/sweet_77/Documents/New%20project/server/index.mjs)
- 消息服务：
  - [server/modules/message-service/index.mjs](/Users/sweet_77/Documents/New%20project/server/modules/message-service/index.mjs)
- 消息仓储：
  - [server/repositories/message-repository.mjs](/Users/sweet_77/Documents/New%20project/server/repositories/message-repository.mjs)
- 30 天清理：
  - [server/modules/message-retention-service/index.mjs](/Users/sweet_77/Documents/New%20project/server/modules/message-retention-service/index.mjs)

后端当前已经实现：

- `POST /messages/text`
- `POST /messages/image`
- `POST /messages/emoji`
- `GET /messages/conversation`
- `GET /messages/poll`

其中：

- `GET /messages/conversation` 已支持 `cursor`
- 返回 `items`、`nextCursor`、`hasMore`
- 服务启动后会先执行一次消息保留清理
- 后续会按固定间隔继续清理 30 天前消息
- CORS 允许来源已支持环境变量配置

## 3. 已知限制

当前最重要的已知限制见：

- [limited.md](/Users/sweet_77/Documents/New%20project/limited.md)

现阶段仍未完成的重点有：

- 会话列表
- 已读回执
- 撤回消息
- 相对路径 `/api`、开发代理和同源部署收敛
- 浏览器系统通知 / 离线推送
- 自定义表情包 / 表情搜索
- 图片对象存储与更稳的文件方案

## 4. 推荐下一步优先级

如果交给下一个 agent 继续推进，我建议优先顺序是：

1. 局域网或线上部署配置
2. 会话列表
3. 已读回执
4. 浏览器系统通知
5. 撤回消息

其中第 1 项已经完成了第一阶段：支持运行时注入、按访问主机自动推导、以及可配置 CORS；下一阶段更适合继续收敛到相对路径和代理 / 同源部署。

## 5. 局域网 / 线上部署建议

当前比较推荐的方向是：

1. 前端继续保留统一配置入口
2. 保留现有运行时配置注入 `apiBaseUrl`
3. 后续逐步改成相对路径 `/api`
4. 给前端开发服务器增加 `/api` 代理
5. 最后再接反向代理或同源部署

如果下一个 agent 直接继续做这一项，优先关注这些文件：

- [client-app/config/api.js](/Users/sweet_77/Documents/New%20project/client-app/config/api.js)
- [client-app/index.html](/Users/sweet_77/Documents/New%20project/client-app/index.html)
- [client-app/dev-server.mjs](/Users/sweet_77/Documents/New%20project/client-app/dev-server.mjs)
- [server/index.mjs](/Users/sweet_77/Documents/New%20project/server/index.mjs)
- [README.md](/Users/sweet_77/Documents/New%20project/README.md)
- [limited.md](/Users/sweet_77/Documents/New%20project/limited.md)

## 6. 验证方式

基础检查：

```bash
npm run check
```

最常用的手工验证：

1. 启动后端
2. 启动前端
3. 双开 `user_a` / `user_b`
4. 建立绑定
5. 发送文本、图片、表情
6. 刷新历史
7. 点击加载更多消息
8. 观察页内通知
9. 用局域网 IP 访问前端并验证自动推导 API 地址

## 7. 本次交接要提醒下一个 agent 的事

- `update.md` 现在已经约定为“每次对话落地任务都要追加更新记录”
- 以后继续做任何功能，都要同步更新：
  - [update.md](/Users/sweet_77/Documents/New%20project/update.md)
  - [limited.md](/Users/sweet_77/Documents/New%20project/limited.md)
- 如果功能范围变化明显，也要同步更新：
  - [README.md](/Users/sweet_77/Documents/New%20project/README.md)

## 8. 一句话交接

这是一个已经跑通消息闭环、并且补到了图片、表情、分页、页内通知、30 天清理的聊天项目；下一个 agent 最适合优先接手“局域网 / 线上部署配置”这一条主线。
这是一个已经跑通消息闭环、并且补到了图片、表情、分页、页内通知、30 天清理和局域网地址配置第一阶段的聊天项目；下一个 agent 最适合优先接手“相对路径 `/api` + 代理 / 同源部署收敛”这条主线。
