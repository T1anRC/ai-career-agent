# Day13 开发日志：Docker Compose 部署

## 今日目标

让 AI Career Agent 支持 Docker Compose 一键启动，为后续 README、面试展示和项目部署做准备。

## 完成内容

1. 新增后端 `Dockerfile`
   - 使用 `python:3.11-slim`
   - 安装 `requirements.txt`
   - 启动 FastAPI：`uvicorn app.main:app --host 0.0.0.0 --port 8000`

2. 新增前端 `Dockerfile`
   - 使用 `node:22-alpine`
   - 执行 `npm ci`
   - 执行 `npm run build`
   - 通过 `npm run start` 启动 Next.js

3. 新增 `docker-compose.yml`
   - `db`：PostgreSQL
   - `backend`：FastAPI
   - `frontend`：Next.js
   - 增加 `postgres_data` 和 `chroma_data` 数据卷
   - 将 PostgreSQL 映射到宿主机 `5433`，避免和本机已有 PostgreSQL 的 `5432` 冲突

4. 后端启动初始化增强
   - 启动时自动创建数据库表
   - 启动时自动构建 RAG 知识库

5. 前端 API 地址配置化
   - 新增 `NEXT_PUBLIC_API_BASE_URL`
   - 不再把所有请求地址写死在多个 `fetch` 调用中

6. 修复前端 lint 问题
   - 移除未使用组件
   - 调整本地存储和数据库画像加载逻辑

7. 新增 Docker 部署说明
   - 编写 `DOCKER.md`
   - 说明环境变量、启动命令、服务组成和数据卷

## 今日验证

已通过：

```bash
cd frontend
npm.cmd run lint
npm.cmd run build
```

```bash
cd backend
python -m py_compile app\main.py app\schemas.py app\models.py app\database.py app\prompts.py app\services\deepseek_service.py app\services\rag_service.py app\services\resume_parser.py app\services\analysis_tools.py
```

已通过：

```bash
docker compose config
```

已通过：

```bash
docker compose build
docker compose up -d
```

启动验证结果：

- PostgreSQL 容器状态为 healthy
- FastAPI 后端启动成功，`GET /` 返回正常
- Next.js 前端启动成功，`http://localhost:3000` 返回 200
- 后端启动日志显示数据库表创建成功，RAG 知识库初始化写入 4 个片段

构建过程中发现本机访问 Docker Hub 授权接口超时，因此将基础镜像切换为 AWS Public ECR 的 Docker 官方镜像副本：

- `public.ecr.aws/docker/library/python:3.11-slim`
- `public.ecr.aws/docker/library/node:22-alpine`
- `public.ecr.aws/docker/library/postgres:16-alpine`

这样可以避开当前 Docker Hub 网络阻塞，同时仍然使用 Docker 官方镜像内容。

## 今日收获

Docker Compose 的核心作用是把多个服务的启动方式统一起来。这个项目里，前端、后端和数据库原本需要分别启动，现在可以通过 Compose 描述为一个整体。

容器内部访问数据库不能写 `localhost`，因为 `localhost` 指的是当前容器自己。后端容器访问 PostgreSQL 容器时，要使用 Compose 服务名 `db`。

## 面试表达

Day13 我为 AI Career Agent 增加了 Docker Compose 部署能力，将 PostgreSQL、FastAPI 后端和 Next.js 前端统一编排起来。后端容器启动时会自动创建数据库表，并构建本地 Chroma RAG 知识库；前端 API 地址也改成环境变量配置，方便在本地和容器环境中切换。

这一步让项目从只能手动启动的本地 Demo，进一步变成可以一键拉起的工程化 AI 全栈项目。
