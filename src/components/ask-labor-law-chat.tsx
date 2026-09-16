"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  askLaborLawQuestion,
  type AskLaborLawSource,
  type AskLaborLawState,
} from "@/app/(app)/ask-labor-law/actions";

const DISCLAIMER =
  "هذه إجابة استرشادية آلية، لأي قرار رسمي يرجى الرجوع لقسم الموارد البشرية أو النص الرسمي لنظام العمل.";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      sources: AskLaborLawSource[];
    }
  | { id: string; role: "error"; content: string };

let messageIdCounter = 0;
function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

export function AskLaborLawChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isPending) return;

    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), role: "user", content: trimmed },
    ]);
    setQuestion("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("question", trimmed);
      const initialState: AskLaborLawState = {};
      const result = await askLaborLawQuestion(initialState, formData);

      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { id: nextMessageId(), role: "error", content: result.error! },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextMessageId(),
          role: "assistant",
          content: result.answer ?? "",
          sources: result.sources ?? [],
        },
      ]);
    });
  };

  return (
    <div className="flex h-[70vh] max-w-2xl flex-col rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            اكتب سؤالك عن نظام العمل بالأسفل، مثل: &quot;كم مدة إجازتي
            السنوية؟&quot;
          </p>
        )}

        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {isPending && (
          <div className="mr-auto max-w-[85%] rounded-lg border border-border px-3 py-2 text-sm text-muted">
            جارٍ البحث في نظام العمل...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="اكتب سؤالك هنا..."
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPending || !question.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
        >
          إرسال
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
        <p className="text-right">{message.content}</p>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="mr-auto max-w-[85%] rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
        <p className="text-right">{message.content}</p>
      </div>
    );
  }

  return (
    <div className="mr-auto flex max-w-[85%] flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
      {message.sources.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">
            المواد المرجعية:
          </span>
          <div className="flex flex-col gap-1">
            {message.sources.map((source, index) => (
              <div
                key={index}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <p className="text-right font-medium">{source.articleTitle}</p>
                {source.chapterTitle && (
                  <p className="text-right text-muted">
                    {source.chapterTitle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-right text-sm whitespace-pre-wrap">
        {message.content}
      </p>

      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-right text-xs text-amber-800 dark:text-amber-300">
        {DISCLAIMER}
      </p>
    </div>
  );
}
