"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const quickQuestions = [
  "我想找 Java 后端实习，但项目经验比较少，应该怎么准备？",
  "我做过 YOLOv11 无人机检测系统，怎么写进简历？",
  "我想去上海找软件开发实习，应该怎么规划？",
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你好，我是 AI Career Agent。你可以告诉我你的求职方向、简历项目、目标岗位，我会帮你分析和准备。",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function sendMessage(content: string) {
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

                  <div className="whitespace-pre-wrap">{message.content}</div>
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
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Enter 发送，Shift + Enter 换行
          </p>
        </form>
      </div>
    </main>
  );
}