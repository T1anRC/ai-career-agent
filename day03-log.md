# AI Career Agent Day03 学习记录

## 一、今日目标

Day03 的目标是让 AI Career Agent 从普通聊天机器人升级为“具备用户画像能力的求职智能体”。

核心目标：

- 设计用户画像 Profile 数据结构
- 前端维护用户画像状态
- 后端接收用户画像
- Prompt 根据用户画像动态生成
- AI 根据用户画像给出更个性化的求职建议
- 用户画像支持页面展示、编辑、本地保存和恢复默认值

---

## 二、今日完成内容

### 1. 后端新增 UserProfile 数据结构

在 `backend/app/schemas.py` 中新增了 `UserProfile` 数据结构：

- target_role：目标岗位
- target_city：目标城市
- skills：技术栈
- projects：项目经历
- weaknesses：当前短板
- goal：阶段目标

并将 `ChatRequest` 从只接收 messages，升级为同时接收：

- messages
- profile

---

### 2. 后端 Prompt 支持用户画像

在 `backend/app/prompts.py` 中完成 Prompt 拆分和升级：

- BASE_SYSTEM_PROMPT：定义 AI Career Agent 的身份和回答要求
- build_profile_prompt：根据用户画像生成画像 Prompt
- build_system_prompt：组合基础 Prompt 和用户画像 Prompt

这样后端每次调用大模型时，都会把当前用户画像传给模型。

---

### 3. DeepSeek 服务层支持 profile

在 `backend/app/services/deepseek_service.py` 中，将原来的调用逻辑升级为：

```python
chat_with_deepseek(messages, profile)