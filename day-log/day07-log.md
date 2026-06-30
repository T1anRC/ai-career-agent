# Day07 学习记录：学习路线规划 Agent

## 一、今日目标

今天的目标是为 AI Career Agent 新增【学习路线规划 Agent】。

该功能用于根据用户画像、目标岗位、岗位 JD 和当前短板，生成阶段性学习路线，帮助用户明确接下来应该学习什么、怎么学、如何把学习内容转化为项目能力和面试表达。

---

## 二、今日完成内容

### 1. 后端新增 study_plan 模式 Prompt

在 `backend/app/prompts.py` 中新增：

```python
def build_study_plan_prompt(profile) -> str: