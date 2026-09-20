"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { openai, EMBEDDING_MODEL, CHAT_MODEL } from "@/lib/openai";

export type AskLaborLawSource = {
  articleTitle: string;
  chapterTitle: string | null;
};

export type AskLaborLawState = {
  error?: string;
  answer?: string;
  sources?: AskLaborLawSource[];
};

const SYSTEM_PROMPT = `أنت مساعد داخلي يجيب على أسئلة موظفي الشركة عن نظام العمل السعودي.
- أجب فقط بناءً على المواد المرفقة أدناه، ولا تخترع أي معلومة غير موجودة فيها.
- اذكر رقم/اسم المادة التي استندت إليها في إجابتك.
- إذا لم تجد إجابة واضحة ضمن المواد المرفقة، صرّح بذلك صراحة بدل التخمين أو الاعتماد على معرفة عامة خارج المواد المرفقة.
- أجب باللغة العربية بإيجاز ووضوح.`;

const REWRITE_SYSTEM_PROMPT = `ستُعطى محادثة بين موظف ونظام معلومات عن نظام العمل السعودي، تنتهي برسالة أخيرة من المستخدم. أعد صياغة هذه الرسالة الأخيرة فقط بوضوح وبصيغة سؤال قانوني مكتمل يخص نظام العمل السعودي، مستفيدًا من سياق المحادثة السابقة لحل أي غموض فيها (كالضمائر أو الإشارات غير الواضحة). لا تُجب على السؤال، ولا تُضف أي معلومة جديدة، فقط وضّح الصياغة. أرجع نص السؤال المعاد صياغته فقط دون أي شرح إضافي أو علامات تنصيص.`;

type RetrievedChunk = {
  id: string;
  content: string;
  chapterTitle: string | null;
  articleTitle: string | null;
  similarity: number;
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

function parseHistory(raw: FormDataEntryValue | null): HistoryMessage[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is HistoryMessage =>
          !!item &&
          typeof item === "object" &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string",
      )
      .slice(-2)
      .map((item) => ({ role: item.role, content: item.content.slice(0, 1000) }));
  } catch {
    return [];
  }
}

export async function askLaborLawQuestion(
  _prevState: AskLaborLawState,
  formData: FormData,
): Promise<AskLaborLawState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "الرجاء تسجيل الدخول" };
  }

  const question = formData.get("question");
  if (typeof question !== "string" || !question.trim()) {
    return { error: "الرجاء كتابة سؤال" };
  }
  const trimmedQuestion = question.trim();
  const history = parseHistory(formData.get("history"));

  // Rewriting only helps (and is only needed) when there is prior conversation
  // context to disambiguate against, e.g. a vague follow-up like "وكم مدتها؟".
  // For a standalone question, rewriting tends to pad a short, precise query
  // with generic legal phrasing that dilutes its embedding and hurts
  // retrieval — even when history exists, the current message can still be a
  // clear, self-contained question (e.g. "تشغيل النساء؟" right after an
  // unrelated prior question). So rather than trust rewriting's judgment
  // about ambiguity, search with BOTH the raw and rewritten wording whenever
  // a rewrite happens, and merge the results — a clear question still
  // surfaces via its own strong raw-text match even if the rewrite drifted.
  let rewrittenQuestion: string | null = null;
  if (history.length > 0) {
    try {
      const rewriteCompletion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: REWRITE_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: trimmedQuestion },
        ],
        temperature: 0,
      });
      const rewritten = rewriteCompletion.choices[0]?.message?.content?.trim();
      if (rewritten && rewritten !== trimmedQuestion) {
        rewrittenQuestion = rewritten;
      }
    } catch {
      // Rewriting is a best-effort accuracy improvement; fall back to
      // raw-only search if it fails instead of blocking the whole request.
    }
  }
  const searchQuestion = rewrittenQuestion ?? trimmedQuestion;

  async function embed(text: string): Promise<number[]> {
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return embeddingResponse.data[0].embedding;
  }

  let rawEmbedding: number[];
  try {
    rawEmbedding = await embed(trimmedQuestion);
  } catch {
    return { error: "تعذر معالجة السؤال حاليًا، حاول مرة أخرى لاحقًا" };
  }

  let rewrittenEmbedding: number[] | null = null;
  if (rewrittenQuestion) {
    try {
      rewrittenEmbedding = await embed(rewrittenQuestion);
    } catch {
      // Best-effort: fall back to raw-only retrieval if this fails.
    }
  }

  // SQLite has no native vector search, so every row is fetched and scored
  // in JavaScript. This is fine at this dataset's size (a few dozen policy
  // articles) but would not scale to a large corpus.
  const allChunks = await prisma.policyChunk.findMany({
    where: { embedding: { not: null } },
  });

  function topMatches(embedding: number[]): RetrievedChunk[] {
    return allChunks
      .map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        chapterTitle: chunk.chapterTitle,
        articleTitle: chunk.articleTitle,
        similarity: cosineSimilarity(
          embedding,
          JSON.parse(chunk.embedding as string) as number[],
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  const rawMatches = topMatches(rawEmbedding);
  const rewrittenMatches = rewrittenEmbedding ? topMatches(rewrittenEmbedding) : [];

  // Merge both result sets with Reciprocal Rank Fusion instead of comparing
  // raw cosine scores directly: a longer, more generic rewritten question
  // tends to score more uniformly high across many unrelated chunks, which
  // can let it crowd out a correct raw-text match when merging by absolute
  // score. RRF instead scores each chunk by its RANK within each list
  // (1/(k + rank), k = 60 — the standard constant that keeps a single
  // strong top-1 hit from dominating too heavily), summing across lists
  // when a chunk appears in both. This is scale-invariant, so it fuses the
  // two rankings fairly regardless of how each query's raw scores are
  // distributed.
  const RRF_K = 60;
  const rrfById = new Map<string, { chunk: RetrievedChunk; score: number }>();
  for (const matches of [rawMatches, rewrittenMatches]) {
    matches.forEach((chunk, index) => {
      const rank = index + 1;
      const entry = rrfById.get(chunk.id) ?? { chunk, score: 0 };
      entry.score += 1 / (RRF_K + rank);
      rrfById.set(chunk.id, entry);
    });
  }

  const chunks = Array.from(rrfById.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.chunk);

  if (chunks.length === 0) {
    return { error: "لا تتوفر بيانات كافية للإجابة على هذا السؤال حاليًا" };
  }

  const contextText = chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] ${chunk.articleTitle ?? "بدون عنوان"}${
          chunk.chapterTitle ? ` (${chunk.chapterTitle})` : ""
        }\n${chunk.content}`,
    )
    .join("\n\n");

  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `المواد ذات الصلة من نظام العمل:\n\n${contextText}\n\nسؤال الموظف: ${searchQuestion}`,
        },
      ],
      temperature: 0.2,
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return { error: "تعذر توليد إجابة، حاول مرة أخرى" };
    }

    return {
      answer,
      sources: chunks.map((chunk) => ({
        articleTitle: chunk.articleTitle ?? "بدون عنوان",
        chapterTitle: chunk.chapterTitle,
      })),
    };
  } catch {
    return { error: "تعذر توليد إجابة حاليًا، حاول مرة أخرى لاحقًا" };
  }
}
