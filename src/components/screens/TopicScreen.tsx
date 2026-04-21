import { ArrowLeft, Bookmark, Play, Sparkles, Loader2, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppState } from "@/hooks/useAppState";
import { toast } from "sonner";

type Topic = { id: string; title: string; description: string; category: string; difficulty: string; icon: string; color: string; lesson_content: string | null };

export const TopicScreen = () => {
  const { user } = useAuth();
  const { selectedTopicId, setSelectedTopicId, refreshKey, triggerRefresh } = useAppState();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showGen, setShowGen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: all } = await supabase.from("topics").select("*").order("created_at", { ascending: false });
      setAllTopics((all as Topic[]) || []);
      const id = selectedTopicId || all?.[0]?.id;
      if (id) {
        const { data } = await supabase.from("topics").select("*").eq("id", id).maybeSingle();
        setTopic(data as Topic | null);
      }
      setLoading(false);
    })();
  }, [selectedTopicId, refreshKey]);

  const startLearning = async () => {
    if (!user || !topic) {
      if (!user) toast.error("Sign in to track progress");
      return;
    }
    const { data: existing } = await supabase
      .from("topic_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("topic_id", topic.id)
      .maybeSingle();
    if (existing) {
      await supabase.from("topic_progress")
        .update({ progress_percent: Math.min(100, existing.progress_percent + 25), last_visited_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("topic_progress").insert({
        user_id: user.id, topic_id: topic.id, progress_percent: 25,
      });
    }
    toast.success("+25% progress! Open the Quiz phone →");
    triggerRefresh();
  };

  const generateAI = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz", { body: { topic: aiPrompt } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { data: newTopic, error: tErr } = await supabase.from("topics").insert({
        title: data.title, description: data.description, category: data.category,
        icon: data.icon || "✨", color: "from-violet-500 to-fuchsia-500",
        lesson_content: data.lesson, ai_generated: true,
        created_by: user?.id ?? null,
      }).select().single();
      if (tErr) throw tErr;
      const rows = data.questions.map((q: any, i: number) => ({
        topic_id: newTopic.id, question: q.question, options: q.options,
        correct_index: q.correct_index, explanation: q.explanation, position: i + 1,
      }));
      await supabase.from("quiz_questions").insert(rows);
      toast.success(`Generated: ${data.title}`);
      setShowGen(false); setAiPrompt("");
      setSelectedTopicId(newTopic.id);
      triggerRefresh();
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary-glow" /></div>;
  }
  if (!topic) {
    return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No topics yet</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative h-36 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${topic.color}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white_0%,transparent_40%)] opacity-20" />
        <div className="relative z-10 px-4 pt-12 flex items-center justify-between">
          <button onClick={() => setShowGen(!showGen)} className="w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button className="w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-[9px] text-white/70 uppercase tracking-widest">{topic.category} · {topic.difficulty}</p>
          <h2 className="text-lg font-display font-bold text-white leading-tight mt-0.5 flex items-center gap-2">
            <span>{topic.icon}</span> {topic.title}
          </h2>
        </div>
      </div>

      <div className="flex-1 px-4 pt-3 overflow-y-auto scrollbar-hide pb-4">
        {showGen ? (
          <div className="glass-card rounded-2xl p-3 mb-3 space-y-2">
            <p className="text-[10px] font-semibold flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary-glow" /> Generate AI quiz</p>
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. Roman Empire"
              className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-[11px] outline-none placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button onClick={generateAI} disabled={generating || !aiPrompt.trim()} className="flex-1 py-2 rounded-xl bg-gradient-primary text-white text-[10px] font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generating ? "Generating..." : "Generate"}
              </button>
              <button onClick={() => setShowGen(false)} className="px-3 rounded-xl glass text-[10px] font-medium">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowGen(true)} className="w-full glass-card rounded-2xl p-2.5 mb-3 flex items-center gap-2 text-left">
            <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
            <span className="text-[10px] font-semibold flex-1">Generate a new topic with AI</span>
            <span className="text-[10px] text-primary-glow">+</span>
          </button>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-muted-foreground">{topic.description}</p>
          <button onClick={startLearning} className="ml-2 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-[0_10px_30px_-8px_hsl(258_90%_66%/0.6)] flex-shrink-0">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </button>
        </div>

        <div className="glass-card rounded-2xl p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BookOpen className="w-3 h-3 text-primary-glow" />
            <p className="text-[10px] font-display font-semibold">Lesson</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">{topic.lesson_content || "No lesson content yet."}</p>
        </div>

        <p className="text-[10px] font-display font-semibold mb-2">All Topics</p>
        <div className="space-y-1.5">
          {allTopics.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopicId(t.id)}
              className={`w-full glass-card rounded-xl p-2 flex items-center gap-2 text-left ${t.id === topic.id ? "ring-1 ring-primary/50" : ""}`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center text-xs flex-shrink-0`}>{t.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold truncate">{t.title}</p>
                <p className="text-[9px] text-muted-foreground truncate">{t.category}</p>
              </div>
              {t.id === topic.id && <span className="text-[8px] font-bold text-primary-glow bg-primary/10 px-1.5 py-0.5 rounded-full">NOW</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
