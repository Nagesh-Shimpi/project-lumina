import { supabase } from "@/integrations/supabase/client";

export type AdaptiveDecision = {
  difficulty: "beginner" | "intermediate" | "advanced";
  strategy: "teach" | "practice" | "revise";
  shouldFocusMistakes: boolean;
  topicStats: { attempts: number; avg: number; last_pct: number } | null;
  overall: string;
};

export async function getAdaptiveDecision(topicId: string | null, action: "next_difficulty" | "should_revise" = "next_difficulty"): Promise<AdaptiveDecision | null> {
  const { data, error } = await supabase.functions.invoke("tutor-adaptive", {
    body: { topic_id: topicId, action },
  });
  if (error) { console.error(error); return null; }
  return data as AdaptiveDecision;
}

export const difficultyMeta: Record<string, { label: string; color: string; emoji: string }> = {
  beginner: { label: "Beginner", color: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/40", emoji: "🟢" },
  intermediate: { label: "Intermediate", color: "bg-amber-500/20 text-amber-300 ring-amber-400/40", emoji: "🟡" },
  advanced: { label: "Advanced", color: "bg-rose-500/20 text-rose-300 ring-rose-400/40", emoji: "🔴" },
};