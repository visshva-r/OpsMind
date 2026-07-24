"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Send } from "lucide-react";
import { CitationList, ConfidenceBadge, PageHeader } from "@/components/ui";
import { ChatSkeleton } from "@/components/shell";
import { MarkdownMessage } from "@/lib/markdown";
import type { ChatMessage, Citation } from "@/lib/types";

const starterQuestions = [
  "Why is pump P-101 experiencing repeat seal failures?",
  "What are the vibration limits for P-101 and current status?",
  "What compliance gaps exist before the next Factory Act audit?",
  "What is the isolation procedure before opening P-101 casing?",
];

export default function CopilotClient() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am OpsMind Expert Copilot. Ask about maintenance history, SOP limits, regulatory requirements, or equipment relationships. I answer with source citations and confidence scores.",
      confidence: 1,
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [docCount, setDocCount] = useState(12);
  const bottomRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  useEffect(() => {
    fetch("/api/documents")
      .then((response) => response.json())
      .then((data) => setDocCount(data.stats?.documentsIndexed ?? 12));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !bootstrapped.current) {
      bootstrapped.current = true;
      submitQuery(q);
    }
  }, [searchParams]);

  async function submitQuery(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations as Citation[],
          confidence: data.confidence,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I could not process that request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitQuery(query);
  }

  async function copyAnswer(content: string) {
    await navigator.clipboard.writeText(content);
  }

  return (
    <div>
      <PageHeader
        title="Expert Knowledge Copilot"
        description="RAG-powered conversational AI over SOPs, work orders, inspection reports, OEM manuals, and regulatory documents — with citations and confidence scores."
        badge={`⚡ Local RAG Engine Active · ${docCount} Docs Indexed`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {starterQuestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => submitQuery(question)}
            disabled={loading}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-white disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg p-4 ${
                message.role === "user"
                  ? "ml-8 bg-cyan-500/10"
                  : "mr-8 bg-slate-950/80"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <span>{message.role === "user" ? "You" : "OpsMind Copilot"}</span>
                  {message.confidence != null && message.role === "assistant" && (
                    <ConfidenceBadge score={message.confidence} />
                  )}
                </div>
                {message.role === "assistant" && index > 0 && (
                  <button
                    type="button"
                    onClick={() => copyAnswer(message.content)}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-300"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                )}
              </div>
              <div className="mt-2">
                {message.role === "assistant" ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <p className="text-sm leading-7 text-slate-200">
                    {message.content}
                  </p>
                )}
              </div>
              {message.citations && (
                <CitationList citations={message.citations} />
              )}
            </div>
          ))}
          {loading && <ChatSkeleton />}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex gap-3 border-t border-slate-800 p-4"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about equipment history, SOP limits, or compliance..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-medium text-slate-950 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
