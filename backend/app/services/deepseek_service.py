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