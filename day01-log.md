# Day 01 学习记录

## 今天完成内容

1. 搭建 Next.js + TypeScript + Tailwind CSS 前端项目
2. 搭建 FastAPI 后端项目
3. 完成前后端接口联调
4. 接入 DeepSeek API，实现真实 AI 回复
5. 配置 .env 管理 API Key
6. 创建 .gitignore，避免提交敏感信息和依赖目录
7. 完成第一次 Git 提交

## 当前项目结构

- frontend：Next.js 前端页面
- backend：FastAPI 后端接口
- backend/.env：保存 DeepSeek API Key，不提交到 Git
- backend/app/main.py：后端主接口文件
- frontend/app/page.tsx：前端聊天页面

## 今天理解的内容

- 前端负责页面展示和用户输入
- 后端负责接收请求、调用模型 API、返回结果
- API Key 不能写在前端，也不能上传 GitHub
- .gitignore 可以防止敏感文件和依赖目录被提交
- Git commit 可以保存项目阶段性成果

## 明天计划

1. 优化聊天页面结构
2. 增加多轮对话记录
3. 开始做简历上传功能
4. 后端解析简历文本
5. 为后续岗位 JD 匹配和 RAG 做准备