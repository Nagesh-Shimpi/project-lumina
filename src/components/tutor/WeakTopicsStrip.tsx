import { AlertCircle, RotateCcw } from "lucide-react";
import type { StudentProfile } from "@/lib/tutor/memoryManager";

type Props = {
  profile: StudentProfile | null;
  onPickTopic: (topicId: string) => void;
  onRetryMistakes: () => void;
};

export const WeakTopicsStrip = ({ profile, onPickTopic, onRetryMistakes }: Props) => {
  if (!profile) return null;
  const weak = profile.weakTopics;
  const mistakeCount = profile.mistakes.length;
  if (!weak.length && !mistakeCount) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground">Focus areas</span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {weak.map((t) => (
          <button
            key={t.id}
            onClick={() => onPickTopic(t.id)}
            className="glass rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 hover:scale-105 transition-transform shrink-0"
          >
            <span>{t.icon}</span>
            <span className="font-medium">{t.title}</span>
            <span className="text-[9px] text-amber-400 font-bold">{Math.round(t.avg)}%</span>
          </button>
        ))}
        {mistakeCount >= 1 && (
          <button
            onClick={onRetryMistakes}
            className="rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 bg-gradient-primary text-white font-semibold shrink-0 hover:scale-105 transition-transform"
          >
            <RotateCcw className="w-3 h-3" />
            Retry {mistakeCount} mistake{mistakeCount === 1 ? "" : "s"}
          </button>
        )}
      </div>
    </div>
  );
};