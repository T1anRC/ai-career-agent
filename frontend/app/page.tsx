"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim() || loading) return;

    const userMessage = message;
    setCurrentQuestion(userMessage);
    setMessage("");
    setReply("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await res.json();
      setReply(data.reply);
    } catch (error) {
      setReply("请求失败，请检查后端是否启动。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Career Agent</h1>
          <p className="text-gray-400 mt-2">
            AI 全栈求职智能体 Demo：Next.js + FastAPI + DeepSeek API
          </p>
        </div>

        <textarea
          className="w-full h-32 rounded-lg bg-gray-900 border border-gray-700 p-4 outline-none resize-none"
          placeholder="请输入你的问题，比如：我现在下一步应该做什么？"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button
          onClick={sendMessage}
          disabled={loading || !message.trim()}
          className="rounded-lg bg-white text-black px-5 py-2 font-medium disabled:opacity-50"
        >
          {loading ? "AI 思考中..." : "发送"}
        </button>

        {currentQuestion && (
          <div className="rounded-lg bg-gray-900 border border-gray-700 p-4">
            <p className="text-gray-400 mb-2">你的问题：</p>
            <p>{currentQuestion}</p>
          </div>
        )}

        <div className="rounded-lg bg-gray-900 border border-gray-700 p-4 min-h-40 whitespace-pre-wrap leading-7">
          {loading ? "正在调用 AI，请稍等..." : reply || "AI 回复会显示在这里。"}
        </div>
      </div>
    </main>
  );
}