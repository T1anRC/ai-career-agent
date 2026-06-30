# Day04 学习记录：简历项目优化 Agent

## 一、今日目标

Day04 的目标是让 AI Career Agent 从“具备用户画像能力的聊天助手”，升级为“能够生成简历项目描述的求职智能体”。

核心功能：

- 根据用户画像生成简历项目描述
- 根据项目经历输出可用于简历的内容
- 输出面试讲解版本
- 前端提供一键触发入口
- AI 回复支持 Markdown 渲染

---

## 二、后端完成内容

### 1. ChatRequest 新增 mode 字段

在 `backend/app/schemas.py` 中，为 `ChatRequest` 增加了：

```python
mode: str = "chat"