# Day11 学习记录：PostgreSQL 数据库持久化

## 一、今日目标

Day11 的目标是让 AI Career Agent 从前端 localStorage 临时保存，升级为后端 PostgreSQL 数据库存储。

核心目标包括：

1. 接入 PostgreSQL 数据库
2. 保存用户画像 Profile
3. 保存聊天会话和聊天消息
4. 保存 AI 分析记录
5. 前端可以读取并展示数据库中的历史数据

---

## 二、完成内容

### 1. 安装并配置 PostgreSQL

今日完成了 PostgreSQL 的本地安装，并通过 pgAdmin 创建项目数据库：

```text
ai_career_agent