import { TrendingUp, Award, Target, Clock, Flame, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppState } from "@/hooks/useAppState";

type Attempt = { id: string; score: number; total: number; xp_earned: number; created_at: string; topic: { title: string; icon: string } | null };

export const ProgressScreen = () => {
  const { user, profile } = useAuth();
  const { refreshKey } = useAppState();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("quiz_attempts")
        .select("id,score,total,xp_earned,created_at, topic:topics(title,icon)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setAttempts((data as any) || []);
      setLoading(false);
    })();
  }, [user, refreshKey]);

  const totalXP = profile?.xp ?? 0;
  const totalQuizzes = attempts.length;
  const avgAccuracy = totalQuizzes > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / totalQuizzes)
    : 0;
  const totalCorrect = attempts.reduce((s, a) => s + a.score, 0);

  // Build last-7-day chart from attempts
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const dayXP = attempts
      .filter((a) => a.created_at.slice(0, 10) === key)
      .reduce((s, a) => s + a.xp_earned, 0);
    return { d: ["S","M","T","W","T","F","S"][d.getDay()], v: dayXP };
  });
  const maxV = Math.max(...days.map((d) => d.v), 50);

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-3">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-display font-bold">Sign in to track progress</p>
        <p className="text-[11px] text-muted-foreground mt-1">XP, streaks, accuracy & more</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-12 pb-2">
        <p className="text-[10px] text-muted-foreground">Your journey</p>
        <h2 className="text-xl font-display font-bold">Progress</h2>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary-glow" /></div>
      ) : (
        <div className="flex-1 px-4 overflow-y-auto scrollbar-hide pb-4 space-y-3">
          <div className="relative rounded-3xl p-4 bg-gradient-to-br from-orange-500 via-primary to-violet-600 overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[9px] text-white/80 uppercase tracking-widest">Total XP</p>
                <p className="text-3xl font-display font-bold text-white mt-0.5">{totalXP}</p>
                <p className="text-[10px] text-white/80 mt-0.5">🔥 {profile?.streak ?? 0} day streak</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-display font-semibold">XP this week</p>
                <p className="text-[9px] text-muted-foreground">{days.reduce((s,d)=>s+d.v,0)} XP earned</p>
              </div>
              <div className="flex items-center gap-1 text-accent">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold">7d</span>
              </div>
            </div>
            <div className="flex items-end justify-between h-20 gap-1.5">
              {days.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-md bg-gradient-to-t from-primary to-primary-glow transition-all" style={{ height: `${Math.max(4, (d.v / maxV) * 100)}%` }} />
                  <span className="text-[8px] text-muted-foreground font-medium">{d.d}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Clock, label: "Quizzes", value: String(totalQuizzes), color: "text-primary-glow" },
              { icon: Award, label: "Correct", value: String(totalCorrect), color: "text-accent" },
              { icon: Target, label: "Accuracy", value: `${avgAccuracy}%`, color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-2.5 text-center">
                <s.icon className={`w-3.5 h-3.5 mx-auto ${s.color}`} />
                <p className="text-sm font-display font-bold mt-1">{s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-display font-semibold mb-1.5">Recent Quizzes</p>
            {attempts.length === 0 ? (
              <p className="text-[10px] text-muted-foreground glass-card rounded-2xl p-3 text-center">Take a quiz to see history</p>
            ) : (
              <div className="space-y-1.5">
                {attempts.slice(0, 5).map((a) => {
                  const pct = Math.round((a.score / a.total) * 100);
                  const perfect = pct === 100;
                  return (
                    <div key={a.id} className="glass-card rounded-2xl p-2.5 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-violet flex items-center justify-center text-base">
                        {perfect ? "🎯" : a.topic?.icon || "📚"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate">{a.topic?.title || "Quiz"}</p>
                        <p className="text-[9px] text-muted-foreground">{a.score}/{a.total} · {pct}%</p>
                      </div>
                      <span className="text-[10px] font-bold text-accent">+{a.xp_earned}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
