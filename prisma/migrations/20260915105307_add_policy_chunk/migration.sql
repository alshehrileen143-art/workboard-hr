-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "PolicyChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chapterTitle" TEXT,
    "articleTitle" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyChunk_pkey" PRIMARY KEY ("id")
);
