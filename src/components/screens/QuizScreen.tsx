import { X, Flame, Check, Loader2, Trophy, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppState } from "@/hooks/useAppState";
import { toast } from "sonner";

type Q = { id: string; question: string; options: string[]; correct_index: number; explanation: string | null };
type Topic = { id: string; title: string; icon: string };

export const QuizScreen = () => {
  const { user, refreshProfile, profile } = useAuth();
  const { selectedTopicId, refreshKey, triggerRefresh } = useAppState();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setIdx(0); setPicked(null); setChecked(false); setScore(0); setDone(false);
      const { data: t } = await supabase.from("topics").select("id,title,icon").order("created_at").limit(1).maybeSingle();
      const id = selectedTopicId || t?.id;
      if (!id) { setLoading(false); return; }
      const { data: tp } = await supabase.from("topics").select("id,title,icon").eq("id", id).maybeSingle();
      setTopic(tp as Topic | null);
      const { data: qs } = await supabase
        .from("quiz_questions")
        .select("id,question,options,correct_index,explanation")
        .eq("topic_id", id)
        .order("position");
      setQuestions((qs as any) || []);
      setLoading(false);
    })();
  }, [selectedTopicId, refreshKey]);

  const current = questions[idx];

  const check = () => {
    if (picked === null || !current) return;
    setChecked(true);
    if (picked === current.correct_index) setScore((s) => s + 1);
  };

  const next = async () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1); setPicked(null); setChecked(false);
    } else {
      setDone(true);
      if (user && topic) {
        setSaving(true);
        const finalScore = score + (picked === current?.correct_index ? 0 : 0); // already counted
        const xp = finalScore * 10;
        await supabase.from("quiz_attempts").insert({
          user_id: user.id, topic_id: topic.id, score: finalScore, total: questions.length, xp_earned: xp,
        });
        const { data: prof } = await supabase.from("profiles").select("xp").eq("user_id", user.id).single();
        if (prof) {
          await supabase.from("profiles").update({ xp: (prof.xp || 0) + xp }).eq("user_id", user.id);
        }
        const { data: tp } = await supabase.from("topic_progress").select("*").eq("user_id", user.id).eq("topic_id", topic.id).maybeSingle();
        if (tp) {
          await supabase.from("topic_progress").update({ progress_percent: 100, completed: true, last_visited_at: new Date().toISOString() }).eq("id", tp.id);
        } else {
          await supabase.from("topic_progress").insert({ user_id: user.id, topic_id: topic.id, progress_percent: 100, completed: true });
        }
        await refreshProfile();
        triggerRefresh();
        setSaving(false);
        toast.success(`+${xp} XP earned! 🎉`);
      }
    }
  };

  const restart = () => {
    setIdx(0); setPicked(null); setChecked(false); setScore(0); setDone(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary-glow" /></div>;
  if (!current && !done) return <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">Pick a topic first</div>;

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-4 animate-pulse-glow">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-primary-glow font-bold">Quiz Complete</p>
        <h2 className="text-2xl font-display font-bold mt-1">{score} / {questions.length}</h2>
        <p className="text-xs text-muted-foreground mt-1">{pct}% accuracy</p>
        {user && <p className="text-xs text-accent mt-2">+{score * 10} XP earned</p>}
        {saving && <Loader2 className="w-3 h-3 animate-spin mt-2" />}
        <button onClick={restart} className="mt-5 px-5 py-2.5 rounded-2xl bg-gradient-primary text-white text-xs font-semibold flex items-center gap-2">
          <RotateCcw className="w-3 h-3" /> Try again
        </button>
      </div>
    );
  }

  const isCorrect = checked && picked === current.correct_index;
  const isWrong = checked && picked !== current.correct_index;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-12 pb-3 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full glass flex items-center justify-center">
          <X className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
        </div>
        <div className="flex items-center gap-1 glass rounded-full px-2 py-0.5">
          <Flame className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] font-bold">{profile?.streak ?? 0}</span>
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto scrollbar-hide pb-4">
        <p className="text-[9px] text-primary-glow font-bold uppercase tracking-widest mt-1">
          {topic?.icon} {topic?.title} · Question {idx + 1} of {questions.length}
        </p>
        <h3 className="text-sm font-display font-bold leading-snug mt-2">{current.question}</h3>

        <div className="mt-4 space-y-2">
          {current.options.map((opt, i) => {
            const selected = picked === i;
            const showCorrect = checked && i === current.correct_index;
            const showWrong = checked && selected && i !== current.correct_index;
            return (
              <button
                key={i}
                disabled={checked}
                onClick={() => setPicked(i)}
                className={`w-full rounded-2xl p-3 flex items-center gap-2.5 transition-all text-left ${
                  showCorrect ? "bg-emerald-500/30 ring-1 ring-emerald-400" :
                  showWrong ? "bg-red-500/30 ring-1 ring-red-400" :
                  selected ? "bg-gradient-primary shadow-[0_10px_30px_-10px_hsl(258_90%_66%/0.6)]" :
                  "glass-card"
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  selected || showCorrect ? "bg-white/20 text-white" : "bg-secondary text-foreground"
                }`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <p className={`text-[11px] font-medium flex-1 ${selected || showCorrect || showWrong ? "text-white" : ""}`}>{opt}</p>
                {showCorrect && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>

        {checked && current.explanation && (
          <div className={`glass-card rounded-2xl p-2.5 mt-3 flex items-start gap-2 ${isCorrect ? "ring-1 ring-emerald-400/50" : "ring-1 ring-red-400/50"}`}>
            <span className="text-sm">{isCorrect ? "✅" : "💡"}</span>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">{isCorrect ? "Correct!" : "Not quite."}</span> {current.explanation}
            </p>
          </div>
        )}

        {!checked ? (
          <button
            onClick={check}
            disabled={picked === null}
            className="w-full mt-4 py-3 rounded-2xl bg-gradient-primary text-white font-semibold text-xs shadow-[0_10px_30px_-8px_hsl(258_90%_66%/0.6)] disabled:opacity-40"
          >
            Check Answer
          </button>
        ) : (
          <button onClick={next} className="w-full mt-4 py-3 rounded-2xl bg-gradient-primary text-white font-semibold text-xs">
            {idx + 1 < questions.length ? "Next Question" : "Finish Quiz"}
          </button>
        )}
      </div>
    </div>
  );
};
