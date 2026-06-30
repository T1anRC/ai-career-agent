from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ChatRequest, ChatResponse
from app.services.deepseek_service import get_ai_reply


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "AI Career Agent backend is running"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if len(request.messages) == 0:
        return ChatResponse(reply="请先输入你的问题。")

    try:
        reply = get_ai_reply(request.messages)
        return ChatResponse(reply=reply)

    except Exception as e:
        print("DeepSeek API Error:", e)
        return ChatResponse(
            reply="后端调用 AI 服务时出现错误，请检查 API Key、网络连接或后端日志。"
        )