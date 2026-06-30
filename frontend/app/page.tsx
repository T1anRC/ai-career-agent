"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
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

const quickQuestions = [
  "我想找 Java 后端实习，但项目经验比较少，应该怎么准备？",
  "我做过的项目，该怎么写进简历？",
  "我想去上海找软件开发实习，应该怎么规划？",
];

const PROFILE_STORAGE_KEY = "ai-career-agent-profile";

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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch {
        setProfile(defaultProfile);
      }
    }

    setIsProfileLoaded(true);
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

  async function sendMessage(content: string, mode: string = "chat") {
    const trimmedInput = content.trim();

    if (!trimmedInput || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmedInput,
    };

    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          profile,
          mode,
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.reply,
      };

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
    const projectText =
      profile.projects.length > 0
        ? profile.projects.join("、")
        : "AI Career Agent";

    sendMessage(
      `请基于我的用户画像，帮我优化以下项目经历，让它可以直接写进简历，并给出面试讲解版本：${projectText}`,
      "resume_project"
    );
  }

  function handleJobMatchAnalyze() {
    if (!jobDescription.trim()) {
      alert("请先粘贴岗位 JD，再进行岗位匹配分析。");
      return;
    }

    sendMessage(
      `请基于我的用户画像，帮我分析下面这个岗位和我的匹配度，并给出投递建议、简历修改建议和面试准备重点。

  岗位 JD：
  ${jobDescription}`,
      "job_match"
    );
  }

  function handleInterviewPrepare() {
    const interviewTarget = jobDescription.trim()
      ? `岗位 JD：\n${jobDescription}`
      : `目标岗位：${profile.target_role}`;

    sendMessage(
      `请基于我的用户画像，帮我准备下面这个方向的面试问答。

  ${interviewTarget}

  请输出高频面试问题、技术基础问题、项目追问问题、短板追问问题、第一人称回答示例和面试前复习清单。`,
      "interview"
    );
  }

  function handleStudyPlanGenerate() {
    const studyTarget = jobDescription.trim()
      ? `岗位 JD：\n${jobDescription}`
      : `目标岗位：${profile.target_role}`;

    sendMessage(
      `请基于我的用户画像，帮我为下面这个方向生成学习路线规划。

  ${studyTarget}

  请输出目标岗位分析、当前能力基础、核心短板、7 天学习计划、15 天项目提升路线、30 天能力提升路线、每日学习任务模板、练习项目建议和面试复习重点。`,
      "study_plan"
    );
  }

  function handleRagQuestion() {
    const content = input.trim();

    if (!content || isLoading) {
      return;
    }

    sendMessage(content, "rag");
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
    <main className="min-h-screen bg-gray-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
        <header className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Career Agent
              </h1>
              <p className="mt-2 text-gray-600">
                一个帮助你分析求职方向、优化简历项目、准备面试回答的 AI 求职智能体。
              </p>
            </div>

            <button
              onClick={handleClearChat}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              清空对话
            </button>
            <button
              type="button"
              onClick={handleResumeProjectOptimize}
              disabled={isLoading}
              className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              一键优化简历项目
            </button>
          </div>
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                岗位 JD 匹配分析
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setJobDescription("")}
                  disabled={isLoading || !jobDescription.trim()}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  清空 JD
                </button>

                <button
                  type="button"
                  onClick={handleJobMatchAnalyze}
                  disabled={isLoading || !jobDescription.trim()}
                  className="rounded-full border border-purple-500 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "分析中..." : "一键分析岗位匹配度"}
                </button>
                <button
                  type="button"
                  onClick={handleInterviewPrepare}
                  disabled={isLoading}
                  className="rounded-full border border-blue-500 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "生成中..." : "生成面试准备"}
                </button>
                <button
                  type="button"
                  onClick={handleStudyPlanGenerate}
                  disabled={isLoading}
                  className="rounded-full border border-purple-500 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "生成中..." : "生成学习计划"}
                </button>
              </div>
            </div>

            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="请粘贴岗位 JD，例如岗位职责、任职要求、技术栈要求等..."
             className="min-h-32 w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400"
            />
          </div>
        </header>

        <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-gray-700">
            你可以快速测试这些问题：
          </p>

          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question) => (
              <button
                key={question}
                onClick={() => setInput(question)}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:border-blue-500 hover:text-blue-600"
              >
                {question}
              </button>
            ))}
          </div>
        </section>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  当前用户画像
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  AI Career Agent 会根据这些信息给出更精准的求职建议
                </p>
              </div>

              <button
                onClick={handleResetProfile}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                恢复默认画像
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-gray-500">目标岗位</label>
                <input
                  value={profile.target_role}
                  onChange={(e) => updateProfileField("target_role", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-500">目标城市</label>
                <input
                  value={profile.target_city}
                  onChange={(e) => updateProfileField("target_city", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-500">技术栈</label>
                <input
                  value={profile.skills.join("、")}
                  onChange={(e) => updateProfileListField("skills", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-500">项目经历</label>
                <input
                  value={profile.projects.join("、")}
                  onChange={(e) => updateProfileListField("projects", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-500">当前短板</label>
                <input
                  value={profile.weaknesses.join("、")}
                  onChange={(e) => updateProfileListField("weaknesses", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-500">阶段目标</label>
                <textarea
                  value={profile.goal}
                  onChange={(e) => updateProfileField("goal", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

        <section className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex h-[55vh] flex-col gap-4 overflow-y-auto pr-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="mb-1 text-xs opacity-70">
                    {message.role === "user" ? "你" : "AI Career Agent"}
                  </div>

                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        h2: ({ ...props }) => (
                          <h2 className="mt-4 mb-2 text-lg font-bold text-gray-900" {...props} />
                        ),
                        h3: ({ ...props }) => (
                          <h3 className="mt-3 mb-2 text-base font-semibold text-gray-900" {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p className="mb-3 leading-7 text-gray-800" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="mb-3 list-disc space-y-1 pl-5 text-gray-800" {...props} />
                        ),
                        li: ({ ...props }) => (
                          <li className="leading-7" {...props} />
                        ),
                        strong: ({ ...props }) => (
                          <strong className="font-semibold text-gray-900" {...props} />
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
                <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600">
                  AI Career Agent 正在思考中...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl bg-white p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：我想找 Java 后端实习，但项目经验比较少，应该怎么准备？"
              className="min-h-24 flex-1 resize-none rounded-xl border border-gray-300 p-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-24 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isLoading ? "等待中" : "发送"}
            </button>
            <button
              type="button"
              onClick={handleRagQuestion}
              disabled={isLoading || !input.trim()}
              className="rounded-full border border-green-500 px-4 py-2 text-sm text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              知识库问答
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Enter 发送，Shift + Enter 换行
          </p>
        </form>
      </div>
    </main>
  );
}