from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.resume_parser import parse_resume_file
from app.schemas import ChatRequest, ChatResponse
from app.services.deepseek_service import chat_with_deepseek
from app.services.analysis_tools import analyze_resume_with_tools
from app.services.rag_service import build_knowledge_base
from typing import Annotated
from sqlmodel import Session, select, SQLModel
from app.database import create_db_and_tables, get_session
from app.models import User, Profile, ChatSession, ChatMessage, AnalysisRecord
from datetime import datetime

app = FastAPI()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    chunk_count = build_knowledge_base()
    print(f"RAG 知识库初始化完成，写入 {chunk_count} 个片段")

class ToolAnalysisRequest(BaseModel):
    resume_text: str
    jd_text: str = ""

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
async def chat(request: ChatRequest):
    print("当前 mode：", request.mode)
    print("main.py 收到的简历长度：", len(request.resume_text or ""))
    print("main.py 简历前100字：", (request.resume_text or "")[:100])

    reply = chat_with_deepseek(
        messages=request.messages,
        profile=request.profile,
        mode=request.mode,
        resume_text=request.resume_text,
    )

    return ChatResponse(reply=reply)

@app.post("/api/tools/analyze")
def analyze_with_tools(request: ToolAnalysisRequest):
    tool_result = analyze_resume_with_tools(
        resume_text=request.resume_text,
        jd_text=request.jd_text,
    )

    return {
        "message": "工具分析成功",
        "tool_result": tool_result,
    }

@app.post("/api/resume/parse")
async def parse_resume(file: UploadFile = File(...)):
    """
    上传简历文件，并解析为纯文本。
    支持 txt、pdf、docx。
    """

    try:
        resume_text = await parse_resume_file(file)

        return {
            "filename": file.filename,
            "resume_text": resume_text,
            "text_length": len(resume_text),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"简历解析失败：{str(e)}")


SessionDep = Annotated[Session, Depends(get_session)]


class ProfileRequest(SQLModel):
    target_role: str = ""
    target_city: str = ""
    skills: list[str] = []
    projects: list[str] = []
    weaknesses: list[str] = []
    goal: str = ""

class ChatSessionRequest(SQLModel):
    title: str = "新的对话"

class ChatMessageRequest(SQLModel):
    session_id: int
    role: str
    content: str

class AnalysisRecordRequest(SQLModel):
    analysis_type: str
    title: str = "新的分析记录"
    input_text: str = ""
    result_text: str = ""

@app.post("/api/db/test-user")
def create_test_user(session: SessionDep):
    user = User(name="测试用户", email="test@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "message": "测试用户创建成功",
        "user": user,
    }


@app.get("/api/db/users")
def get_users(session: SessionDep):
    users = session.exec(select(User)).all()

    return {
        "message": "用户列表获取成功",
        "count": len(users),
        "users": users,
    }


@app.post("/api/profile")
def save_profile(profile_data: ProfileRequest, session: SessionDep):
    profile = session.exec(
        select(Profile).where(Profile.user_id == 1)
    ).first()

    if profile is None:
        profile = Profile(user_id=1)

    profile.target_role = profile_data.target_role
    profile.target_city = profile_data.target_city
    profile.skills = profile_data.skills
    profile.projects = profile_data.projects
    profile.weaknesses = profile_data.weaknesses
    profile.goal = profile_data.goal
    profile.updated_at = datetime.now()

    session.add(profile)
    session.commit()
    session.refresh(profile)

    return {
        "message": "用户画像保存成功",
        "profile": profile,
    }


@app.get("/api/profile")
def get_profile(session: SessionDep):
    profile = session.exec(
        select(Profile).where(Profile.user_id == 1)
    ).first()

    if profile is None:
        return {
            "message": "当前还没有保存用户画像",
            "profile": None,
        }

    return {
        "message": "用户画像读取成功",
        "profile": profile,
    }


@app.post("/api/chat-sessions")
def create_chat_session(session_data: ChatSessionRequest, session: SessionDep):
    chat_session = ChatSession(
        user_id=1,
        title=session_data.title,
    )

    session.add(chat_session)
    session.commit()
    session.refresh(chat_session)

    return {
        "message": "聊天会话创建成功",
        "chat_session": chat_session,
    }


@app.post("/api/chat-messages")
def create_chat_message(message_data: ChatMessageRequest, session: SessionDep):
    chat_session = session.get(ChatSession, message_data.session_id)

    if chat_session is None:
        raise HTTPException(status_code=404, detail="聊天会话不存在")

    if message_data.role not in ["user", "assistant", "system"]:
        raise HTTPException(status_code=400, detail="role 只能是 user、assistant 或 system")

    chat_message = ChatMessage(
        session_id=message_data.session_id,
        role=message_data.role,
        content=message_data.content,
    )

    chat_session.updated_at = datetime.now()

    session.add(chat_message)
    session.add(chat_session)
    session.commit()
    session.refresh(chat_message)

    return {
        "message": "聊天消息保存成功",
        "chat_message": chat_message,
    }


@app.get("/api/chat-sessions/{session_id}/messages")
def get_chat_messages(session_id: int, session: SessionDep):
    chat_session = session.get(ChatSession, session_id)

    if chat_session is None:
        raise HTTPException(status_code=404, detail="聊天会话不存在")

    messages = session.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()

    return {
        "message": "聊天消息读取成功",
        "session_id": session_id,
        "count": len(messages),
        "messages": messages,
    }


@app.get("/api/chat-sessions")
def get_chat_sessions(session: SessionDep):
    chat_sessions = session.exec(
        select(ChatSession)
        .where(ChatSession.user_id == 1)
        .order_by(ChatSession.updated_at.desc())
    ).all()

    return {
        "message": "聊天会话列表读取成功",
        "count": len(chat_sessions),
        "chat_sessions": chat_sessions,
    }


@app.post("/api/analysis-records")
def create_analysis_record(record_data: AnalysisRecordRequest, session: SessionDep):
    record = AnalysisRecord(
        user_id=1,
        analysis_type=record_data.analysis_type,
        title=record_data.title,
        input_text=record_data.input_text,
        result_text=record_data.result_text,
    )

    session.add(record)
    session.commit()
    session.refresh(record)

    return {
        "message": "分析记录保存成功",
        "analysis_record": record,
    }


@app.get("/api/analysis-records")
def get_analysis_records(session: SessionDep):
    records = session.exec(
        select(AnalysisRecord)
        .where(AnalysisRecord.user_id == 1)
        .order_by(AnalysisRecord.created_at.desc())
    ).all()

    return {
        "message": "分析记录列表读取成功",
        "count": len(records),
        "analysis_records": records,
    }
