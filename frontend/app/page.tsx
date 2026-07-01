"use client";

import React,{ FormEvent, KeyboardEvent, ChangeEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";


type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UserProfile = {
  target_role: string;
  target_city: string;
  skills: string[];
  projects: string[];
  weaknesses: string[];
  goal: string;
};

type ChatSessionRecord = {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
};

type AnalysisRecord = {
  id: number;
  user_id: number;
  analysis_type: string;
  title: string;
  input_text: string;
  result_text: string;
  created_at: string;
};


const quickQuestions = [
  "我想找 Java 后端实习，但项目经验比较少，应该怎么准备？",
  "我做过的项目，该怎么写进简历？",
  "我想去上海找软件开发实习，应该怎么规划？",
];

const PROFILE_STORAGE_KEY = "ai-career-agent-profile";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const defaultProfile: UserProfile = {
  target_role: "AI 全栈开发实习生",
  target_city: "上海",
  skills: ["Python", "FastAPI", "Next.js", "Tailwind CSS", "Git"],
  projects: ["AI Career Agent", "无人机检测系统"],
  weaknesses: ["没有实习经历", "项目包装能力还不够"],
  goal: "15天做出一个可以写进简历、可以面试展示的AI求职智能体项目",
};

export default function Home() {

  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你好，我是 AI Career Agent。你可以告诉我你的求职方向、简历项目、目标岗位，我会帮你分析和准备。",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [isParsingResume, setIsParsingResume] = useState(false);
  const hasResumeText = resumeText.trim().length > 0;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessionRecord[]>([]);
  const [analysisRecords, setAnalysisRecords] = useState<AnalysisRecord[]>([]);

  const updateProfileField = (
    field: keyof UserProfile,
    value: string | string[]
  ) => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      [field]: value,
    }));
  };

  const updateProfileListField = (
    field: "skills" | "projects" | "weaknesses",
    value: string
  ) => {
    const list = value
      .split(/[,，、]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setProfile((prevProfile) => ({
      ...prevProfile,
      [field]: list,
    }));
  };

  const handleResetProfile = () => {
    setProfile(defaultProfile);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(defaultProfile));
  };

  // 读取本地保存的用户画像
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile));
        } catch {
          setProfile(defaultProfile);
        }
      }

      setIsProfileLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // 用户画像变化时自动保存
  useEffect(() => {
    if (!isProfileLoaded) {
      return;
    }

    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile, isProfileLoaded]);

  // 聊天自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedResumeText = localStorage.getItem("ai-career-agent-resume-text");
      const savedResumeFileName = localStorage.getItem("ai-career-agent-resume-file-name");

      if (savedResumeText) {
        setResumeText(savedResumeText);
      }

      if (savedResumeFileName) {
        setResumeFileName(savedResumeFileName);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("ai-career-agent-resume-text", resumeText);
    localStorage.setItem("ai-career-agent-resume-file-name", resumeFileName);
  }, [resumeText, resumeFileName]);

  async function sendMessage(content: string, mode: string = "chat") {
    const trimmedInput = content.trim();

    if (!trimmedInput || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedInput,
    };


    let sessionId = currentSessionId;

    try {
      if (!sessionId) {
        const title =
          trimmedInput.length > 20
            ? trimmedInput.slice(0, 20) + "..."
            : trimmedInput;
        sessionId = await createChatSession(title || "新的对话");
        setCurrentSessionId(sessionId);
      }

      await saveChatMessageToDatabase(sessionId, "user", trimmedInput);
    } catch (error) {
      console.error("保存用户消息失败：", error);
    }


    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages =
        mode === "chat" || mode === "rag"
          ? newMessages
          : [userMessage];

      const requestBody = {
        messages: apiMessages,
        profile,
        mode,
        resume_text: resumeText,
      };

      console.log("发送给后端的数据：", requestBody);
      console.log("发送给后端的简历长度：", resumeText.length);
      console.log("当前模式：", mode);
      console.log("实际发送的消息数量：", apiMessages.length);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply,
      };


      try {
        if (sessionId) {
          await saveChatMessageToDatabase(
            sessionId,
            "assistant",
            assistantMessage.content
          );
        }
      } catch (error) {
        console.error("保存 AI 回复失败：", error);
      }

      const analysisModes = ["resume_project", "job_match", "interview", "study_plan"];

      if (analysisModes.includes(mode)) {
        try {
          await saveAnalysisRecordToDatabase(
            mode,
            getAnalysisTitle(mode, trimmedInput),
            trimmedInput,
            assistantMessage.content
          );

          console.log("分析记录已保存到数据库");
        } catch (error) {
          console.error("保存分析记录失败：", error);
        }
      }

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error("请求失败：", error);

      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "请求后端失败，请检查后端服务是否已经启动。",
      };

      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleResumeProjectOptimize() {
    const hasResume = resumeText.trim().length > 0;

    const content = hasResume
      ? `请基于我上传或粘贴的真实简历内容，帮我做一次简历项目优化。

  要求：
  1. 优先分析真实简历中已有的项目经历
  2. 找出项目描述中不够清楚、不够有含金量的地方
  3. 帮我改写成更适合投递实习岗位的简历表达
  4. 不要编造我没有做过的功能
  5. 输出可以直接放进简历的版本和面试讲解版本`
      : `请基于我的用户画像，帮我优化我的项目经历，让它更适合写进简历和面试展示。`;

    sendMessage(content, "resume_project");
  }

  function handleJobMatchAnalyze() {
    if (!jobDescription.trim()) {
      alert("请先粘贴岗位 JD，再进行岗位匹配分析。");
      return;
    }

    sendMessage(
      `请基于我的真实简历内容和岗位 JD，分析我和下面这个岗位的匹配度。

    请注意：
    1. 如果我已经上传或粘贴了简历，请优先根据真实简历分析
    2. 不要只根据用户画像泛泛判断
    3. 请明确指出简历中已经体现的匹配点
    4. 请明确指出简历中没有体现或表达不够清楚的短板
    5. 请给出可以直接修改到简历里的优化建议

    岗位 JD：
    ${jobDescription}`,
      "job_match"
    );
  }

  function handleInterviewPrepare() {
    const interviewTarget = jobDescription.trim()
      ? `岗位 JD：\n${jobDescription}`
      : `目标岗位：${profile.target_role || "暂未填写"}`;

    const content = resumeText.trim()
      ? `请基于我的真实简历内容、用户画像和下面这个岗位方向，帮我准备面试。

  要求：
  1. 必须优先参考我上传或粘贴的真实简历内容
  2. 面试问题要围绕简历中的项目经历展开
  3. 项目追问要结合我真实做过的功能
  4. 不要编造我没有做过的经历
  5. 请输出高频面试问题、技术基础问题、项目追问问题、短板追问问题、第一人称回答示例和面试前复习清单

  ${interviewTarget}`
      : `请基于我的用户画像，帮我准备下面这个方向的面试问答。

  ${interviewTarget}

  请输出高频面试问题、技术基础问题、项目追问问题、短板追问问题、第一人称回答示例和面试前复习清单。`;

    sendMessage(content, "interview");
  }

  function handleStudyPlanGenerate() {
    const studyTarget = jobDescription.trim()
      ? `岗位 JD：\n${jobDescription}`
      : `目标岗位：${profile.target_role || "暂未填写"}`;

    const content = resumeText.trim()
      ? `请基于我的真实简历内容、用户画像和下面这个岗位方向，帮我生成学习路线规划。

  要求：
  1. 必须优先参考我上传或粘贴的真实简历内容
  2. 请先判断我真实简历中已经具备哪些能力
  3. 再指出我和目标岗位之间的差距
  4. 学习计划要围绕真实短板制定
  5. 不要只根据用户画像泛泛规划
  6. 请输出目标岗位分析、当前能力基础、核心短板、7 天学习计划、15 天项目提升路线、30 天能力提升路线、每日学习任务模板、练习项目建议和面试复习重点

  ${studyTarget}`
      : `请基于我的用户画像，帮我为下面这个方向生成学习路线规划。

  ${studyTarget}

  请输出目标岗位分析、当前能力基础、核心短板、7 天学习计划、15 天项目提升路线、30 天能力提升路线、每日学习任务模板、练习项目建议和面试复习重点。`;

    sendMessage(content, "study_plan");
  }

  async function handleSaveProfileToDatabase() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        throw new Error("保存用户画像失败");
      }

      const data = await response.json();
      console.log("用户画像已保存到数据库：", data);

      alert("用户画像已保存到数据库");
    } catch (error) {
      console.error("保存用户画像失败：", error);
      alert("保存用户画像失败，请检查后端是否启动");
    }
  }

  async function loadProfileFromDatabase(showAlert = true) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/profile`);

      if (!response.ok) {
        throw new Error("读取用户画像失败");
      }

      const data = await response.json();

      if (!data.profile) {
        if (showAlert) {
          alert("数据库里还没有保存用户画像");
        }
        return;
      }

      const dbProfile = data.profile;

      setProfile({
        target_role: dbProfile.target_role || "",
        target_city: dbProfile.target_city || "",
        skills: dbProfile.skills || [],
        projects: dbProfile.projects || [],
        weaknesses: dbProfile.weaknesses || [],
        goal: dbProfile.goal || "",
      });

      if (showAlert) {
        alert("已从数据库读取用户画像");
      }
    } catch (error) {
      console.error("读取用户画像失败：", error);

      if (showAlert) {
        alert("读取用户画像失败，请检查后端是否启动");
      }
    }
  }

  async function handleLoadProfileFromDatabase() {
    await loadProfileFromDatabase(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProfileFromDatabase(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function createChatSession(title: string) {
    const response = await fetch(`${API_BASE_URL}/api/chat-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
      }),
    });

    if (!response.ok) {
      throw new Error("创建聊天会话失败");
    }

    const data = await response.json();
    return data.chat_session.id as number;
  }

  async function saveChatMessageToDatabase(
    sessionId: number,
    role: "user" | "assistant" | "system",
    content: string
  ) {
    const response = await fetch(`${API_BASE_URL}/api/chat-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        role,
        content,
      }),
    });

    if (!response.ok) {
      throw new Error("保存聊天消息失败");
    }

    return response.json();
  }

  async function handleLoadChatSessions() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat-sessions`);

      if (!response.ok) {
        throw new Error("读取历史会话失败");
      }

      const data = await response.json();

      setChatSessions(data.chat_sessions || []);
      alert(`已读取 ${data.count} 条历史会话`);
    } catch (error) {
      console.error("读取历史会话失败：", error);
      alert("读取历史会话失败，请检查后端是否启动");
    }
  }

  async function handleLoadChatMessages(sessionId: number) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/chat-sessions/${sessionId}/messages`
      );

      if (!response.ok) {
        throw new Error("读取聊天消息失败");
      }

      const data = await response.json();

      const loadedMessages: ChatMessage[] = (data.messages || []).map(
        (message: { role: "user" | "assistant" | "system"; content: string }) => ({
          role: message.role === "system" ? "assistant" : message.role,
          content: message.content,
        })
      );

      setMessages(loadedMessages);
      setCurrentSessionId(sessionId);

      alert(`已加载会话 #${sessionId}`);
    } catch (error) {
      console.error("读取聊天消息失败：", error);
      alert("读取聊天消息失败，请检查后端是否启动");
    }
  }

  async function saveAnalysisRecordToDatabase(
    analysisType: string,
    title: string,
    inputText: string,
    resultText: string
  ) {
    const response = await fetch(`${API_BASE_URL}/api/analysis-records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        analysis_type: analysisType,
        title,
        input_text: inputText,
        result_text: resultText,
      }),
    });

    if (!response.ok) {
      throw new Error("保存分析记录失败");
    }

    return response.json();
  }

  async function handleLoadAnalysisRecords() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis-records`);

      if (!response.ok) {
        throw new Error("读取分析记录失败");
      }

      const data = await response.json();

      setAnalysisRecords(data.analysis_records || []);
      alert(`已读取 ${data.count} 条分析记录`);
    } catch (error) {
      console.error("读取分析记录失败：", error);
      alert("读取分析记录失败，请检查后端是否启动");
    }
  }

  function handleOpenAnalysisRecord(record: AnalysisRecord) {
    setMessages([
      {
        role: "user",
        content: record.input_text || record.title,
      },
      {
        role: "assistant",
        content: record.result_text,
      },
    ]);

    alert(`已打开分析记录 #${record.id}`);
  }

  function getAnalysisTitle(mode: string, inputText: string) {
    const shortInput =
      inputText.length > 20 ? inputText.slice(0, 20) + "..." : inputText;

    if (mode === "job_match") {
      return `岗位匹配分析：${shortInput || "未命名岗位"}`;
    }

    if (mode === "resume_project") {
      return `简历项目优化：${shortInput || "未命名项目"}`;
    }

    if (mode === "interview") {
      return `面试准备：${shortInput || "未命名岗位"}`;
    }

    if (mode === "study_plan") {
      return `学习计划：${shortInput || "未命名目标"}`;
    }

    return `AI 分析记录：${shortInput || "未命名记录"}`;
  }

  function handleRagQuestion() {
    const content = input.trim();

    if (!content || isLoading) {
      return;
    }

    sendMessage(content, "rag");
  }

  async function handleResumeFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsParsingResume(true);

    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/parse`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "简历解析失败");
      }

      setResumeText(data.resume_text || "");
      setResumeFileName(data.filename || file.name);
    } catch (error) {
      alert(error instanceof Error ? error.message : "简历解析失败");
    } finally {
      setIsParsingResume(false);
      event.target.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "你好，我是 AI Career Agent。你可以告诉我你的求职方向、简历项目、目标岗位，我会帮你分析和准备。",
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium text-blue-400">
                AI Career Agent
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-white">
                AI 求职智能体平台
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                支持简历解析、岗位匹配分析、简历项目优化、面试准备、学习路线规划、RAG 知识库问答、Tool Calling 结构化分析和历史记录持久化。
              </p>
            </div>

            <button
              onClick={handleClearChat}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              清空对话
            </button>
          </div>
        </header>
        
        <div className="grid flex-1 gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            
            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="mb-4 space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    当前用户画像
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    AI Career Agent 会根据这些信息给出更精准的求职建议
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSaveProfileToDatabase}
                    className="whitespace-nowrap rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                  >
                    保存画像
                  </button>

                  <button
                    onClick={handleLoadProfileFromDatabase}
                    className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500"
                  >
                    读取画像
                  </button>

                  <button
                    onClick={handleResetProfile}
                    className="whitespace-nowrap rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    恢复默认
                  </button>
                </div>
              </div>

              <div className="grid gap-3 text-sm">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">目标岗位</label>
                  <input
                    value={profile.target_role}
                    onChange={(e) => updateProfileField("target_role", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">目标城市</label>
                  <input
                    value={profile.target_city}
                    onChange={(e) => updateProfileField("target_city", e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">技术栈</label>
                  <input
                    value={profile.skills.join("、")}
                    onChange={(e) => updateProfileListField("skills", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">项目经历</label>
                  <input
                    value={profile.projects.join("、")}
                    onChange={(e) => updateProfileListField("projects", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">当前短板</label>
                  <input
                    value={profile.weaknesses.join("、")}
                    onChange={(e) => updateProfileListField("weaknesses", e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">阶段目标</label>
                  <textarea
                    value={profile.goal}
                    onChange={(e) => updateProfileField("goal", e.target.value)}
                    className="min-h-24 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    简历内容
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    可以上传 txt / pdf / docx 简历文件，也可以直接粘贴简历文本。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResumeProjectOptimize}
                  disabled={isLoading}
                  className="whitespace-nowrap rounded-full border border-blue-500/70 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "优化中..." : "优化项目"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                      setResumeText("");
                      setResumeFileName("");
                      localStorage.removeItem("ai-career-agent-resume-text");
                      localStorage.removeItem("ai-career-agent-resume-file-name");
                    }}
                  className="whitespace-nowrap rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  清空简历
                </button>
              </div>

              <input
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleResumeFileUpload}
                disabled={isParsingResume}
                className="mb-2 block w-full text-sm text-gray-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-600 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {isParsingResume && (
                <p className="mb-2 text-sm text-blue-600">
                  正在解析简历文件...
                </p>
              )}

              {resumeFileName && !isParsingResume && (
                <p className="mb-2 text-sm text-green-600">
                  已解析文件：{resumeFileName}
                </p>
              )}

              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="请在这里粘贴你的简历内容，或者上传简历文件后自动解析..."
                className="mt-3 h-40 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <div className="mt-2 flex items-center justify-between text-xs">
                <p className="text-gray-400">
                  当前简历文本长度：{resumeText.length} 字符
                </p>

                {hasResumeText ? (
                  <p className="font-medium text-green-600">
                    已接入真实简历，后续分析会优先参考简历内容
                  </p>
                ) : (
                  <p className="font-medium text-orange-500">
                    暂未接入简历，将主要根据用户画像分析
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  岗位 JD 匹配分析
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setJobDescription("")}
                    disabled={isLoading || !jobDescription.trim()}
                    className="whitespace-nowrap rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    清空
                  </button>

                  <button
                    type="button"
                    onClick={handleJobMatchAnalyze}
                    disabled={isLoading || !jobDescription.trim()}
                    className="whitespace-nowrap rounded-full border border-purple-500/70 bg-purple-500/10 px-3 py-2 text-xs text-purple-300 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "分析中..." : "匹配分析"}
                  </button>
                  <button
                    type="button"
                    onClick={handleInterviewPrepare}
                    disabled={isLoading}
                    className="whitespace-nowrap rounded-full border border-blue-500/70 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "生成中..." : "面试准备"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStudyPlanGenerate}
                    disabled={isLoading}
                    className="whitespace-nowrap rounded-full border border-fuchsia-500/70 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-300 hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "生成中..." : "学习计划"}
                  </button>
                </div>
              </div>

              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="请粘贴岗位 JD，例如岗位职责、任职要求、技术栈要求等..."
                className="mt-3 h-36 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

          <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">历史会话</h2>
                <p className="text-sm text-slate-400">
                  从 PostgreSQL 读取已经保存的聊天会话
                </p>
              </div>

              <button
                onClick={handleLoadChatSessions}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
              >
                查看历史会话
              </button>
            </div>

          <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">分析记录</h2>
                <p className="text-sm text-slate-400">
                  从 PostgreSQL 读取岗位匹配、简历优化、面试准备和学习计划记录
                </p>
              </div>

              <button
                onClick={handleLoadAnalysisRecords}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-400"
              >
                查看分析记录
              </button>
            </div>

            {analysisRecords.length > 0 ? (
              <div className="space-y-2">
                {analysisRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => handleOpenAnalysisRecord(record)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:border-orange-400 hover:bg-orange-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900">
                        #{record.id} {record.title}
                      </div>

                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
                        {record.analysis_type}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      创建时间：{record.created_at}
                    </div>

                    <div className="mt-2 line-clamp-2 text-xs text-gray-600">
                      {record.result_text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">暂无分析记录，点击按钮读取。</p>
            )}
          </section>

            {chatSessions.length > 0 ? (
              <div className="space-y-2">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleLoadChatMessages(session.id)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:border-purple-400 hover:bg-purple-50"
                  >
                    <div className="font-medium text-gray-900">
                      #{session.id} {session.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      更新时间：{session.updated_at}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">暂无历史会话，点击按钮读取。</p>
            )}
          </section>
          </aside>
        
          <section className="flex min-h-[760px] flex-col gap-4 xl:sticky xl:top-6 xl:self-start">


          <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <p className="mb-3 text-sm font-semibold text-white">
              你可以快速测试这些问题：
            </p>

            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => setInput(question)}
                  className="rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-slate-300 hover:border-blue-500/70 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-4 flex min-h-[520px] flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg">
            <div className="flex h-[55vh] flex-col gap-4 overflow-y-auto pr-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800/80 text-slate-100"
                    }`}
                  >
                    <div className="mb-1 text-xs text-slate-400">
                      {message.role === "user" ? "你" : "AI Career Agent"}
                    </div>

                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        components={{
                          h2: ({ ...props }) => (
                            <h2 className="mt-4 mb-2 text-lg font-bold text-white" {...props} />
                          ),
                          h3: ({ ...props }) => (
                            <h3 className="mt-3 mb-2 text-base font-semibold text-white" {...props} />
                          ),
                          p: ({ ...props }) => (
                            <p className="mb-3 leading-7 text-slate-100" {...props} />
                          ),
                          ul: ({ ...props }) => (
                            <ul className="mb-3 list-disc space-y-1 pl-5 text-slate-100" {...props} />
                          ),
                          li: ({ ...props }) => (
                            <li className="leading-7" {...props} />
                          ),
                          strong: ({ ...props }) => (
                            <strong className="font-semibold text-white" {...props} />
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-slate-800/80 px-4 py-3 text-sm text-slate-300">
                    AI Career Agent 正在思考中...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-lg"
          >
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如：我想找 Java 后端实习，但项目经验比较少，应该怎么准备？"
                className="min-h-24 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-24 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {isLoading ? "等待中" : "发送"}
              </button>
              <button
                type="button"
                onClick={handleRagQuestion}
                disabled={isLoading || !input.trim()}
                className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                知识库问答
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Enter 发送，Shift + Enter 换行
            </p>
          </form>
          </section>
        </div>
      </div>
    </main>
  );
}
