import "dotenv/config";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { PrismaClient } from "../src/generated/prisma/client";
import { openai, EMBEDDING_MODEL } from "../src/lib/openai";
 
const prisma = new PrismaClient();
 
// ============================================================
// النوع الذي يمثل مادة واحدة مستخرجة من الملف
// ============================================================
type ParsedChunk = {
  chapterTitle: string | null; // اسم الباب والفصل مجتمعين (مثال: "الباب الخامس — الفصل الثالث")
  articleTitle: string; // عنوان المادة (مثال: "المادة الخامسة والخمسون")
  content: string; // نص المادة كامل
};
 
// ============================================================
// دالة التقطيع: تحوّل HTML الملف إلى قائمة مواد منفصلة
// ============================================================
// الملف الأصلي (.docx) يُميّز كل عنوان مادة بفقرة بخط غامق بالكامل
// تبدأ بكلمة "المادة" (مثال: "المادة الخامسة والخمسون — العقد محدد المدة")،
// ونص المادة نفسه يأتي بالفقرات العادية التي تليها.
// عناوين الباب ("الباب") والفصل ("الفصل") تصل كعناصر h1/h2 وتعطي كل
// مادة سياقها المحيط بها.
function parseLaborLawHtml(html: string): ParsedChunk[] {
  const $ = cheerio.load(html);
  const chunks: ParsedChunk[] = [];
 
  let chapter: string | null = null; // آخر عنوان "باب" (h1) شُوهد
  let section: string | null = null; // آخر عنوان "فصل" (h2) شُوهد
  let currentArticleTitle: string | null = null;
  let currentContent: string[] = [];
 
  // يدمج الباب والفصل الحاليين في عنوان واحد للمادة
  function currentChapterTitle(): string | null {
    if (chapter && section) return `${chapter} — ${section}`;
    return chapter ?? section;
  }
 
  // "يُفرّغ" المادة المكتملة حاليًا إلى قائمة النتائج النهائية،
  // وينظّف المسافات الزائدة، ثم يصفّر المتغيرات المؤقتة استعدادًا للمادة التالية
  function flush() {
    if (currentArticleTitle) {
      const content = currentContent.join(" ").replace(/\s+/g, " ").trim();
      if (content) {
        chunks.push({
          chapterTitle: currentChapterTitle(),
          articleTitle: currentArticleTitle,
          content,
        });
      }
    }
    currentArticleTitle = null;
    currentContent = [];
  }
 
  $("body")
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      const $el = $(el);
      const text = $el.text().trim();
      if (!text) return;
 
      // عنوان باب جديد → أغلق المادة الحالية وابدأ بابًا جديدًا
      if (tag === "h1") {
        flush();
        chapter = text;
        section = null;
        return;
      }
 
      // عنوان فصل جديد → أغلق المادة الحالية وابدأ فصلًا جديدًا
      if (tag === "h2") {
        flush();
        section = text;
        return;
      }
 
      if (tag === "p") {
        // هل هذه الفقرة هي عنوان مادة جديدة؟ (خط غامق + تبدأ بـ"المادة")
        const isArticleHeading =
          $el.find("strong").length > 0 && text.startsWith("المادة");
 
        if (isArticleHeading) {
          flush(); // أغلق المادة السابقة قبل فتح مادة جديدة
          currentArticleTitle = text;
          return;
        }
 
        // فقرة نص عادية → أضفها لمحتوى المادة الحالية (إن وُجدت)
        if (currentArticleTitle) {
          currentContent.push(text);
        }
      }
    });
 
  flush(); // لا تنسي "تفريغ" آخر مادة بعد انتهاء الحلقة
  return chunks;
}
 
// ============================================================
// الدالة الرئيسية: القراءة → التقطيع → التحويل → التخزين
// ============================================================
async function main() {
  // 1) قراءة الملف وتحويله إلى HTML
  const filePath = path.resolve(process.cwd(), "data/labor-law.docx");
  console.log(`reading ${filePath}...`);
  const { value: html } = await mammoth.convertToHtml({ path: filePath });
 
  // 2) تقطيع المحتوى إلى مواد منفصلة
  const chunks = parseLaborLawHtml(html);
  console.log(`parsed ${chunks.length} article chunk(s)`);
 
  if (chunks.length === 0) {
    throw new Error(
      "No article chunks were parsed -- check the document's heading structure",
    );
  }
 
  // عرض قائمة المواد المستخرجة للمراجعة السريعة
  for (const chunk of chunks) {
    console.log(`  - [${chunk.chapterTitle ?? "?"}] ${chunk.articleTitle}`);
  }
 
  // 3) تحويل كل المواد إلى embeddings بطلب واحد (batch) بدل طلب لكل مادة
  //    — أسرع وأقل تكلفة من إرسال 51 طلبًا منفصلًا
  console.log("requesting embeddings from OpenAI...");
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks.map((chunk) => chunk.content),
  });
 
  // 4) حذف أي بيانات قديمة قبل الإدخال (يمنع التكرار عند إعادة التشغيل)
  console.log("clearing existing PolicyChunk rows...");
  await prisma.policyChunk.deleteMany();

  // 5) إدخال كل مادة مع الـ embedding الخاص بها
  //    (يُخزَّن كنص JSON، والتشابه يُحسب لاحقًا في JavaScript — SQLite لا يدعم pgvector)
  console.log("inserting chunks with embeddings...");
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddingResponse.data[i].embedding;

    await prisma.policyChunk.create({
      data: {
        id: randomUUID(),
        content: chunk.content,
        chapterTitle: chunk.chapterTitle,
        articleTitle: chunk.articleTitle,
        embedding: JSON.stringify(embedding),
      },
    });
  }
 
  console.log(`done: inserted ${chunks.length} chunk(s).`);
  await prisma.$disconnect();
}
 
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
 