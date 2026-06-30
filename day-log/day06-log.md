# Day06 学习记录：面试问答准备 Agent

## 今日目标

今天的目标是为 AI Career Agent 新增一个【面试问答准备 Agent】。

在 Day05 已经完成岗位匹配分析 Agent 的基础上，Day06 继续扩展 Agent mode 分流能力，让项目可以根据用户画像和岗位 JD，生成面试准备内容。

---

## 今日完成内容

### 1. 后端新增 interview 模式 Prompt

在 `backend/app/prompts.py` 中新增：

```python
def build_interview_prompt(profile) -> str: