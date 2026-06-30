import os

from dotenv import load_dotenv
from openai import OpenAI

from app.prompts import SYSTEM_PROMPT
from app.schemas import ChatMessage


load_dotenv()


client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com",
)


def get_ai_reply(chat_messages: list[ChatMessage]) -> str:
    """
    调用 DeepSeek API，根据多轮聊天记录生成 AI 回复。
    """

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    for message in chat_messages:
        messages.append(
            {
                "role": message.role,
                "content": message.content,
            }
        )

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
    )

    reply = response.choices[0].message.content

    if not reply:
        return "AI 没有返回有效内容，请稍后再试。"

    return reply