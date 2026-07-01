from datetime import datetime
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(default="默认用户", max_length=100)
    email: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.now)


class Profile(SQLModel, table=True):
    __tablename__ = "profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1, index=True)

    target_role: str = Field(default="", max_length=100)
    target_city: str = Field(default="", max_length=100)

    skills: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    projects: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    weaknesses: list[str] = Field(default_factory=list, sa_column=Column(JSON))

    goal: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.now)


class ChatSession(SQLModel, table=True):
    __tablename__ = "chat_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1, index=True)

    title: str = Field(default="新的对话", max_length=200)

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(index=True)

    role: str = Field(max_length=20)
    content: str

    created_at: datetime = Field(default_factory=datetime.now)


class AnalysisRecord(SQLModel, table=True):
    __tablename__ = "analysis_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(default=1, index=True)

    analysis_type: str = Field(max_length=50)
    title: str = Field(default="新的分析记录", max_length=200)

    input_text: str = Field(default="")
    result_text: str = Field(default="")

    created_at: datetime = Field(default_factory=datetime.now)