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

type RetrievedChunk = {
  id: string;
  content: string;
  chapterTitle: string | null;
  articleTitle: string | null;
  similarity: number;
};

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

  let queryEmbedding: number[];
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: trimmedQuestion,
    });
    queryEmbedding = embeddingResponse.data[0].embedding;
  } catch {
    return { error: "تعذر معالجة السؤال حاليًا، حاول مرة أخرى لاحقًا" };
  }

  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const chunks = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT id, content, "chapterTitle", "articleTitle",
           1 - (embedding <=> ${vectorLiteral}::vector) as similarity
    FROM "PolicyChunk"
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT 3
  `;

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
          content: `المواد ذات الصلة من نظام العمل:\n\n${contextText}\n\nسؤال الموظف: ${trimmedQuestion}`,
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
