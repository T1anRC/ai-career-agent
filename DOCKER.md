# AI Career Agent Docker 部署说明

Day13 的目标是让项目可以用 Docker Compose 一键启动。

## 1. 准备环境变量

后端需要 DeepSeek API Key。先复制示例文件：

```bash
cd backend
copy .env.example .env
```

然后编辑 `backend/.env`：

```env
DEEPSEEK_API_KEY=你的 DeepSeek API Key
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5433/ai_career_agent
```

说明：

- 如果你使用 Docker Compose 里的 PostgreSQL，本地直接运行后端时可以连接 `localhost:5433`。
- Docker Compose 运行时，`docker-compose.yml` 会自动覆盖为容器网络里的 `db` 服务地址。

## 2. 一键启动

在项目根目录运行：

```bash
docker compose up --build
```

启动后访问：

- 前端：http://localhost:3000
- 后端：http://127.0.0.1:8000
- 后端接口文档：http://127.0.0.1:8000/docs
- PostgreSQL：localhost:5433

## 3. 服务组成

当前 Compose 包含三个服务：

- `db`：PostgreSQL 数据库
- `backend`：FastAPI 后端服务
- `frontend`：Next.js 前端服务

数据卷：

- `postgres_data`：保存 PostgreSQL 数据
- `chroma_data`：保存 Chroma 本地向量库数据

## 4. 停止服务

```bash
docker compose down
```

如果需要同时清空数据库和 Chroma 数据：

```bash
docker compose down -v
```

## 5. 当前验证状态

本地代码检查已经通过：

```bash
cd frontend
npm.cmd run lint
npm.cmd run build
```

```bash
cd backend
python -m py_compile app\main.py app\schemas.py app\models.py app\database.py app\prompts.py app\services\deepseek_service.py app\services\rag_service.py app\services\resume_parser.py app\services\analysis_tools.py
```

如果 Docker Hub 网络不稳定，本项目已将基础镜像切换为 AWS Public ECR 的 Docker 官方镜像副本：

- `public.ecr.aws/docker/library/python:3.11-slim`
- `public.ecr.aws/docker/library/node:22-alpine`
- `public.ecr.aws/docker/library/postgres:16-alpine`

重新执行：

```bash
docker compose build
```

当前 Docker 验证已经通过：

```bash
docker compose build
docker compose up -d
```

验证结果：

- 前端 `http://localhost:3000` 返回 200
- 后端 `http://127.0.0.1:8000/` 返回正常
- PostgreSQL 容器状态为 healthy
- 后端启动时完成数据库建表和 RAG 知识库初始化
