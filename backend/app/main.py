from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import ChatRequest, ChatResponse
from app.services.deepseek_service import chat_with_deepseek


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
    return {
        "message": "AI Career Agent backend is running"
    }


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    reply = chat_with_deepseek(
        messages=request.messages,
        profile=request.profile,
        mode=request.mode
    )

    return ChatResponse(reply=reply)