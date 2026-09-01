# Cyber Town

赛博小镇的 TypeScript 后端与 Web 调试台。当前通过 LangGraph 的确定性模拟节点验证浏览器、API、状态图、Docker 和镜像构建链路；后续接入真实 LLM、PostgreSQL 和长期记忆。

LangGraph 第一阶段已经接入，当前使用三个可测试节点执行模拟回复。配套讲解和 SVG 流程图见 [`docs/langgraph-practice-01.md`](./docs/langgraph-practice-01.md)。

## 本地运行

```bash
npm install
npm run dev
```

访问 <http://localhost:3000>，健康检查为 <http://localhost:3000/health>。

## Docker 验证

```bash
docker compose up --build
```

停止服务：

```bash
docker compose down
```

验证与生产一致的 `/town/` 路径代理：

```bash
docker compose --profile path-proxy up --build --detach
```

访问 <http://localhost:3080/town/>，代理健康检查为 <http://localhost:3080/town/health>。

## API

```text
GET  /health
GET  /api/v1/npcs
POST /api/v1/dialogues
```

对话请求示例：

```json
{
  "playerId": "player-001",
  "npcId": "zhang-san",
  "conversationId": "conversation-001",
  "message": "你好"
}
```

## GitHub Actions

`.github/workflows/container.yml` 会在 Pull Request 中验证镜像构建；推送到 `main` 或 `v*` 标签时，会构建 `linux/amd64` 和 `linux/arm64` 镜像并推送到腾讯云 TCR：

```text
ccr.ccs.tencentyun.com/degenerates/cyber-town:latest
```

`main` 分支构建成功后，工作流通过 SSH 把生产 Compose 和部署脚本同步到 `/opt/cyber-town`，再拉取镜像并重建应用容器。需要配置以下 GitHub Secrets：

```text
TCR_USERNAME
TCR_PASSWORD
SSH_HOST
SSH_USER
SSH_PRIVATE_KEY
SSH_PORT（可选，默认 22）
```

线上入口使用 <https://degenerates.site/town/>。现有 Nginx 的一次性接入步骤见 `deploy/NGINX_INTEGRATION.md`。

## 实现阶段

1. Web 与模拟 API 闭环（当前）
2. LangGraph NPC 对话图
3. LLM 结构化输出和安全校验
4. PostgreSQL 对话、关系和 Checkpoint
5. 长期语义记忆
6. 云服务器 Compose、反向代理与 HTTPS
