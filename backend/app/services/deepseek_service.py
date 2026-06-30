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


def chat_with_deepseek(messages: list[ChatMessage], profile: UserProfile, mode: str = "chat") -> str:
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