# Day10 开发日志：Tool Calling 智能体 V1

## 一、今日目标

Day10 的目标是让 AI Career Agent 不只是依赖 Prompt 生成文字，而是能够先调用后端工具函数完成结构化分析，再让大模型基于工具结果生成最终回答。

核心目标：

```text
模型负责理解和表达
工具负责计算和结构化处理
---

## 二、今日完成内容

### 1. 新增后端工具函数文件

新增文件：

```text
backend/app/services/analysis_tools.py