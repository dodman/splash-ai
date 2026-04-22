export type Citation = {
  index: number;
  materialId: string;
  filename: string;
  page?: number | null;
  chunkIndex: number;
  excerpt: string;
};

export type RetrievedChunk = {
  id: string;
  materialId: string;
  filename: string;
  page: number | null;
  chunkIndex: number;
  content: string;
  score: number;
};

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type QuizQuestionShape = {
  type: "MCQ" | "SHORT" | "SCENARIO";
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topic?: string;
};

export type QuizResponseEntry = {
  questionId: string;
  answer: string;
  correct?: boolean;
  pointsAwarded?: number;
  feedback?: string;
};

export type ProgressSummary = {
  hoursStudied: number;
  sessionsCompleted: number;
  quizzesCompleted: number;
  averageScore: number;
  streakDays: number;
  weakTopics: Array<{ topic: string; mastery: number; courseId?: string | null }>;
  strongTopics: Array<{ topic: string; mastery: number }>;
  recentActivity: Array<{
    kind: "chat" | "quiz";
    title: string;
    at: Date;
    href: string;
    detail?: string;
  }>;
};
