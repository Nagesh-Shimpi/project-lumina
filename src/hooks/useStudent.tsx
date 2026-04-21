import { useEffect, useState, useCallback } from "react";
import { getStudentProfile, type StudentProfile, consumeRecommendation } from "@/lib/tutor/memoryManager";
import { runProactiveAgent } from "@/lib/tutor/proactiveAgent";
import { useAuth } from "./useAuth";

export function useStudent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); return; }
    setLoading(true);
    try {
      await runProactiveAgent();
      const p = await getStudentProfile();
      setProfile(p);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const dismiss = async (id: string) => {
    await consumeRecommendation(id);
    setProfile((p) => p ? { ...p, recommendations: p.recommendations.filter((r) => r.id !== id) } : p);
  };

  return { profile, loading, refresh, dismiss };
}