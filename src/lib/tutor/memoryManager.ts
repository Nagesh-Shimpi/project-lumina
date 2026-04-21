import { supabase } from "@/integrations/supabase/client";

export type StudentMemory = {
  id: string;
  user_id: string;
  current_difficulty: "beginner" | "intermediate" | "advanced";
  last_topic_id: string | null;
  last_activity_at: string;
  total_quizzes: number;
  total_correct: number;
  total_questions: number;
  mastery: Record<string, { attempts: number; avg: number; last_pct: number; last_at?: string }>;
  preferences: Record<string, any>;
};

export type Mistake = {
  id: string;
  topic_id: string | null;
  question: string;
  options: string[];
  wrong_index: number | null;
  correct_index: number;
  correct_answer: string | null;
  explanation: string | null;
  times_seen: number;
  mastered_at: string | null;
};

export type Recommendation = {
  id: string;
  kind: "continue" | "revise" | "level_up" | "retry_mistakes";
  topic_id: string | null;
  message: string;
  cta_label: string | null;
  priority: number;
};

export type StudentProfile = {
  memory: StudentMemory | null;
  mistakes: Mistake[];
  recommendations: Recommendation[];
  weakTopics: Array<{ id: string; title: string; icon: string; avg: number; attempts: number }>;
  lastTopic: { id: string; title: string; icon: string } | null;
};

export async function getStudentProfile(): Promise<StudentProfile | null> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess?.session) return null;
  const { data, error } = await supabase.functions.invoke("tutor-memory", { method: "GET" as any });
  if (error) {
    console.error("getStudentProfile", error);
    return null;
  }
  return data as StudentProfile;
}

export async function getWeakTopics() {
  const p = await getStudentProfile();
  return p?.weakTopics ?? [];
}

export async function consumeRecommendation(id: string) {
  await supabase.from("tutor_recommendations").update({ consumed_at: new Date().toISOString() }).eq("id", id);
}

export async function logMistake(input: {
  topic_id: string | null;
  question: string;
  options: string[];
  wrong_index: number;
  correct_index: number;
  correct_answer: string;
  explanation: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("mistakes").insert({ ...input, user_id: user.id });
}

export async function markMistakeMastered(id: string) {
  await supabase.from("mistakes").update({ mastered_at: new Date().toISOString() }).eq("id", id);
}