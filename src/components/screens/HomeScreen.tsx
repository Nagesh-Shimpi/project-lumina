import { Sparkles, BookOpen, Bell, ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppState } from "@/hooks/useAppState";

type Topic = { id: string; title: string; description: string; category: string; icon: string; color: string };
type Progress = { topic_id: string; progress_percent: number; topic: Topic | null };

export const HomeScreen = () => {
  const { user, profile } = useAuth();
  const { setSelectedTopicId, refreshKey } = useAppState();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [continueItem, setContinueItem] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from("topics").select("*").order("created_at").limit(6);
      setTopics((t as Topic[]) || []);
      if (user) {
        const { data: p } = await supabase
          .from("topic_progress")
          .select("topic_id, progress_percent, topic:topics(*)")
          .eq("user_id", user.id)
          .order("last_visited_at", { ascending: false })
          .limit(1);
        if (p && p.length) setContinueItem(p[0] as any); else setContinueItem(null);
      }
      setLoading(false);
    })();
  }, [user, refreshKey]);

  const firstName = profile?.display_name?.split(" ")[0] || "Learner";
  const initial = firstName[0]?.toUpperCase() || "L";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-12 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">{initial}</div>
          <div>
            <p className="text-[10px] text-muted-foreground">Welcome back</p>
            <p className="text-xs font-display font-bold">Hi {firstName} 👋</p>
          </div>
        </div>
        <div className="glass w-8 h-8 rounded-full flex items-center justify-center relative">
          <Bell className="w-3.5 h-3.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
        </div>
      </div>

      <div className="px-4 mt-2 overflow-y-auto scrollbar-hide pb-4 space-y-4">
        <div className="relative rounded-3xl p-4 bg-gradient-primary overflow-hidden shadow-[0_15px_40px_-10px_hsl(258_90%_66%/0.5)]">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
          <Sparkles className="w-5 h-5 text-white mb-2" />
          <h3 className="text-white font-display font-bold text-base leading-tight">Ask anything,<br />learn anything</h3>
          <p className="text-[10px] text-white/80 mt-1">Open the Chat phone to start →</p>
        </div>

        {user && continueItem?.topic && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-display font-semibold">Continue Learning</h4>
            </div>
            <button
              onClick={() => setSelectedTopicId(continueItem.topic!.id)}
              className="w-full glass-card rounded-2xl p-3 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-violet flex items-center justify-center text-base">
                  {continueItem.topic.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{continueItem.topic.title}</p>
                  <p className="text-[9px] text-muted-foreground">{continueItem.topic.category}</p>
                </div>
                <span className="text-[10px] font-bold text-primary-glow">{continueItem.progress_percent}%</span>
              </div>
              <div className="mt-2.5 h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${continueItem.progress_percent}%` }} />
              </div>
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-display font-semibold">Recommended Topics</h4>
            <span className="text-[10px] text-primary-glow">{topics.length}</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary-glow" /></div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopicId(t.id)}
                  className="glass-card rounded-xl p-2.5 flex flex-col gap-1.5 text-left hover:scale-105 transition-transform"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-sm`}>
                    {t.icon}
                  </div>
                  <p className="text-[10px] font-semibold leading-tight line-clamp-2">{t.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-3 flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-primary-glow" />
          <p className="text-[10px] text-muted-foreground flex-1">
            {user ? `${profile?.xp ?? 0} XP earned` : "Sign in to track your XP & streak"}
          </p>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};
