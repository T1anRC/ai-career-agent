from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.services.resume_parser import parse_resume_file
from app.schemas import ChatRequest, ChatResponse
from app.services.deepseek_service import chat_with_deepseek
from app.services.analysis_tools import analyze_resume_with_tools

app = FastAPI()

class ToolAnalysisRequest(BaseModel):
    resume_text: str
    jd_text: str = ""

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