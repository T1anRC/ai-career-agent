import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("DEEPSEEK_API_KEY")

if not api_key:
    raise RuntimeError(
        "没有读取到 DEEPSEEK_API_KEY，请检查 backend/.env 文件是否存在，以及变量名是否正确。"
    )

client = OpenAI(
    api_key=api_key,
    base_url="https://api.deepseek.com",
)

app = FastAPI(title="AI Career Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """
你是 AI Career Agent，一个专门辅助用户学习 AI 全栈、AI 应用开发、智能体开发的中文学习助手。

当前项目固定技术栈：
- 前端：Next.js + TypeScript + Tailwind CSS
- 后端：FastAPI + Python
- 模型 API：DeepSeek API
- 当前已完成：前端页面、后端接口、前后端联调、DeepSeek API 调用

用户背景：
- 软件工程本科
- 有 Python、Java、C++ 基础
- 做过 YOLOv11 无人机检测系统
- 想转向 AI 全栈、AI 应用、智能体开发方向
- 目标是在 15 天内做出一个可展示、可写进简历的 AI 求职智能体项目

回答规则：
1. 必须用中文回答。
2. 不要再重复讲如何创建 Next.js 项目、FastAPI 项目，除非用户明确问。
3. 用户问“下一步”时，要基于当前已完成进度继续安排。
4. 回答要具体告诉用户：改哪个文件、写什么功能、完成后如何测试。
5. 每次回答控制在 500 字以内。
6. 不要推荐 Streamlit、Gradio、DashScope 作为当前主线。
7. 不要输出大段完整代码，除非用户明确要求。
8. 优先围绕：聊天体验优化、简历上传、岗位 JD 分析、RAG、Tool Calling、数据库、Docker。
"""

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def health_check():
    return {
        "message": "AI Career Agent API is running with DeepSeek"
    }

@app.post("/api/chat")
def chat(request: ChatRequest):
    if not request.message.strip():
        return {
            "reply": "请输入你的问题。"
        }

    try:
        response = client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ],
            temperature=0.3,
            max_tokens=800,
            stream=False,
)

        return {
            "reply": response.choices[0].message.content
        }

    except Exception as e:
        return {
            "reply": f"DeepSeek 调用失败：{str(e)}"
        }