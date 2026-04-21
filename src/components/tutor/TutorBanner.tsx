import { Sparkles, X, ArrowRight, RotateCcw, TrendingUp, BookOpen } from "lucide-react";
import { DifficultyPill } from "./DifficultyPill";
import type { Recommendation, StudentProfile } from "@/lib/tutor/memoryManager";

const iconFor = (kind: Recommendation["kind"]) => {
  if (kind === "revise") return <RotateCcw className="w-4 h-4" />;
  if (kind === "level_up") return <TrendingUp className="w-4 h-4" />;
  if (kind === "retry_mistakes") return <RotateCcw className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
};

type Props = {
  profile: StudentProfile | null;
  onAction: (rec: Recommendation) => void;
  onDismiss: (id: string) => void;
};

export const TutorBanner = ({ profile, onAction, onDismiss }: Props) => {
  if (!profile) return null;
  const top = profile.recommendations[0];
  const hasStats = (profile.memory?.total_quizzes ?? 0) > 0;

  return (
    <div className="w-full max-w-2xl mx-auto mb-4 animate-fade-in">
      <div className="glass-card rounded-2xl p-3 md:p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 animate-pulse-glow">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-foreground">Your AI Tutor</span>
            <DifficultyPill level={profile.memory?.current_difficulty} />
            {hasStats && (
              <span className="text-[10px] text-muted-foreground">
                · {profile.memory!.total_quizzes} quiz{profile.memory!.total_quizzes === 1 ? "" : "zes"} ·{" "}
                {profile.memory!.total_questions > 0
                  ? Math.round((profile.memory!.total_correct / profile.memory!.total_questions) * 100)
                  : 0}% avg
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/90 leading-snug">
            {top
              ? top.message
              : hasStats
              ? "Ready for your next session? Ask me anything or try a quiz."
              : "Welcome! Ask me anything to start learning. I'll remember your progress and adapt to you."}
          </p>
          {top && (
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={() => onAction(top)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary text-white text-xs font-semibold px-3 py-1.5 hover:scale-[1.03] transition-transform"
              >
                {iconFor(top.kind)}
                {top.cta_label || "Continue"}
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDismiss(top.id)}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
        {top && (
          <button onClick={() => onDismiss(top.id)} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};