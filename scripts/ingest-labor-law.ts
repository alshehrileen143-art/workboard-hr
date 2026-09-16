import "dotenv/config";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { PrismaClient } from "../src/generated/prisma/client";
import { openai, EMBEDDING_MODEL } from "../src/lib/openai";

const prisma = new PrismaClient();

type ParsedChunk = {
  chapterTitle: string | null;
  articleTitle: string;
  content: string;
};

// The source .docx marks every article heading as a fully-bold paragraph
// starting with "المادة" (e.g. "المادة الخامسة والخمسون — العقد محدد
// المدة"), with its body text in the plain paragraph(s) that follow. Chapter
// ("الباب") and section ("الفصل") headings come through as h1/h2 and give
// each article its surrounding context.
function parseLaborLawHtml(html: string): ParsedChunk[] {
  const $ = cheerio.load(html);
  const chunks: ParsedChunk[] = [];

  let chapter: string | null = null;
  let section: string | null = null;
  let currentArticleTitle: string | null = null;
  let currentContent: string[] = [];

  function currentChapterTitle(): string | null {
    if (chapter && section) return `${chapter} — ${section}`;
    return chapter ?? section;
  }

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

      if (tag === "h1") {
        flush();
        chapter = text;
        section = null;
        return;
      }
      if (tag === "h2") {
        flush();
        section = text;
        return;
      }
      if (tag === "p") {
        const isArticleHeading =
          $el.find("strong").length > 0 && text.startsWith("المادة");
        if (isArticleHeading) {
          flush();
          currentArticleTitle = text;
          return;
        }
        if (currentArticleTitle) {
          currentContent.push(text);
        }
      }
    });

  flush();
  return chunks;
}

async function main() {
  const filePath = path.resolve(process.cwd(), "data/labor-law.docx");
  console.log(`reading ${filePath}...`);
  const { value: html } = await mammoth.convertToHtml({ path: filePath });

  const chunks = parseLaborLawHtml(html);
  console.log(`parsed ${chunks.length} article chunk(s)`);
  if (chunks.length === 0) {
    throw new Error(
      "No article chunks were parsed -- check the document's heading structure",
    );
  }
  for (const chunk of chunks) {
    console.log(`  - [${chunk.chapterTitle ?? "?"}] ${chunk.articleTitle}`);
  }

  console.log("requesting embeddings from OpenAI...");
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks.map((chunk) => chunk.content),
  });

  console.log("clearing existing PolicyChunk rows...");
  await prisma.$executeRawUnsafe(`DELETE FROM "PolicyChunk"`);

  console.log("inserting chunks with embeddings...");
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddingResponse.data[i].embedding;
    const vectorLiteral = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO "PolicyChunk" (id, content, "chapterTitle", "articleTitle", embedding, "createdAt")
      VALUES (${randomUUID()}, ${chunk.content}, ${chunk.chapterTitle}, ${chunk.articleTitle}, ${vectorLiteral}::vector, now())
    `;
  }

  console.log(`done: inserted ${chunks.length} chunk(s).`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
