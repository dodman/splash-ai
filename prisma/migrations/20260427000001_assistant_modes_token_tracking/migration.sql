-- Add new assistant TutorMode enum values (additive – existing data unaffected)
ALTER TYPE "TutorMode" ADD VALUE IF NOT EXISTS 'GENERAL';
ALTER TYPE "TutorMode" ADD VALUE IF NOT EXISTS 'CODE';
ALTER TYPE "TutorMode" ADD VALUE IF NOT EXISTS 'WRITE';
ALTER TYPE "TutorMode" ADD VALUE IF NOT EXISTS 'RESEARCH';
ALTER TYPE "TutorMode" ADD VALUE IF NOT EXISTS 'BUSINESS';

-- Track total token usage per session (for admin cost monitoring)
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "totalTokensUsed" INTEGER NOT NULL DEFAULT 0;
