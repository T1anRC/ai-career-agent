import os
from openai import OpenAI
from dotenv import load_dotenv
from app.services.rag_service import retrieve_knowledge

from app.schemas import ChatMessage, UserProfile
from app.prompts import (
    build_system_prompt,
    build_resume_project_prompt,
    build_job_match_prompt,
    build_interview_prompt,
    build_study_plan_prompt,
    build_rag_prompt,
)
import json
from app.services.analysis_tools import analyze_resume_with_tools

load_dotenv()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)


def chat_with_deepseek(messages: list[ChatMessage], profile: UserProfile, mode: str = "chat", resume_text="") -> str:
    if mode == "resume_project":
        system_prompt = build_resume_project_prompt(profile)

    elif mode == "job_match":
        system_prompt = build_job_match_prompt(profile)

    elif mode == "interview":
        system_prompt = build_interview_prompt(profile)

    elif mode == "study_plan":
        system_prompt = build_study_plan_prompt(profile)

    elif mode == "rag":
        latest_user_message = ""

        for message in reversed(messages):
            if message.role == "user":
                latest_user_message = message.content
                break

        rag_context = retrieve_knowledge(latest_user_message)

        system_prompt = build_rag_prompt(profile, rag_context)

    else:
        system_prompt = build_system_prompt(profile)

    clean_resume_text = resume_text.strip()

    if clean_resume_text:
        system_prompt += f"""

    【用户真实简历内容】
    以下是用户上传或粘贴的真实简历内容，这是本次分析的最高优先级信息。

    {clean_resume_text}

    【强制分析要求】
    1. 如果用户要求岗位匹配、简历优化、面试准备或学习计划，你必须优先基于上面的真实简历内容分析。
    2. 不要只根据用户画像泛泛分析。
    3. 回答中必须明确引用简历中的具体项目、技能或经历。
    4. 如果简历内容和用户画像不一致，以真实简历内容为准。
    5. 如果简历中没有出现某项能力，要明确指出“简历中暂未体现”。
    6. 岗位匹配分析时，必须分别列出：
    - 简历中已经体现的匹配点
    - 简历中没有体现的短板
    - 可以直接改进到简历里的表达
    """


        if mode == "job_match":
            jd_text = messages[-1].content if messages else ""

            tool_result = analyze_resume_with_tools(
                resume_text=clean_resume_text,
                jd_text=jd_text,
            )

            system_prompt += f"""

    【后端工具函数结构化分析结果】
    以下结果来自后端 Python 工具函数的规则计算，不是大模型自由生成。
    你必须在最终回答中单独展示这些工具分析结果，不能只把它们隐含在文字分析里。

    【工具结果 JSON】
    {json.dumps(tool_result, ensure_ascii=False, indent=2)}

    【强制输出要求】
    你的最终回答必须包含以下几个一级或二级标题：

    ## 一、Tool Calling 结构化分析结果

    ### 0. 本次调用的工具函数
    必须列出 called_tools 中的工具函数名称，并用一句话解释每个工具的作用。

    ### 1. 简历结构评分
    必须写出：
    - 结构评分是多少
    - 满分是多少
    - 哪些模块已识别
    - 哪些模块可能缺失

    ### 2. JD 关键词
    必须按类别列出后端工具提取出的 JD 关键词。

    ### 3. 已匹配关键词
    必须列出简历中已经匹配到的关键词。

    ### 4. 缺失关键词
    必须列出简历中暂时没有明显体现的关键词。

    ### 5. 关键词匹配率
    必须写出工具计算得到的 match_rate。

    ## 二、岗位匹配分析
    结合真实简历和岗位 JD，分析用户与岗位的匹配点。

    ## 三、简历修改建议
    必须给出可以直接改进到简历里的建议，不能只泛泛而谈。

    ## 四、投递建议
    给出是否建议投递，以及投递前最应该补强的内容。

    注意：
    1. 不要省略 Tool Calling 结构化分析结果。
    2. 不要只给综合评分。
    3. 不要把工具结果藏在正文里。
    4. 即使工具结果不完美，也要如实展示，并说明这是规则工具的初步分析。
    """

    api_messages = [
        {
            "role": "system",
            "content": system_prompt
        }
    ]

    for message in messages:
        api_messages.append(
            {
                "role": message.role,
                "content": message.content
            }
        )

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=api_messages,
            temperature=0.7
        )

        return response.choices[0].message.content

    except Exception as e:
        print("DeepSeek API 调用失败：", e)
        return "DeepSeek API 调用失败，请检查网络连接、API Key、代理/VPN 设置或 DeepSeek 服务状态。"