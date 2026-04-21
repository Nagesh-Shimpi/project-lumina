import { difficultyMeta } from "@/lib/tutor/adaptiveController";

export const DifficultyPill = ({ level }: { level?: string | null }) => {
  const meta = difficultyMeta[level || "beginner"] || difficultyMeta.beginner;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${meta.color}`}>
      <span>{meta.emoji}</span> {meta.label}
    </span>
  );
};