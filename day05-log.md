# Day05 学习记录：岗位匹配分析 Agent

## 一、今日目标

Day05 的目标是为 AI Career Agent 新增“岗位匹配分析 Agent”。

用户可以粘贴岗位 JD，系统会结合用户画像，分析用户和岗位的匹配程度，并给出：

- 岗位核心要求
- 我的匹配优势
- 当前短板
- 简历修改建议
- 面试准备重点
- 投递建议
- 匹配度评分

通过 Day05，AI Career Agent 从“能优化简历项目”，进一步升级为“能分析真实岗位 JD 和用户匹配度”的求职智能体。

---

## 二、后端完成内容

### 1. 新增 job_match Agent Prompt

在 `backend/app/prompts.py` 中新增：

```python
def build_job_match_prompt(profile) -> str: