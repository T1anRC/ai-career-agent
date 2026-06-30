from typing import Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class UserProfile(BaseModel):
    target_role: str = ""
    target_city: str = ""
    skills: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    goal: str = ""


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    profile: UserProfile = Field(default_factory=UserProfile)
    mode: str = "chat"


class ChatResponse(BaseModel):
    reply: str