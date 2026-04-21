import { getStudentProfile, type StudentProfile } from "./memoryManager";
import { getAdaptiveDecision } from "./adaptiveController";
import { runProactiveAgent } from "./proactiveAgent";

/**
 * Orchestrates the Teach → Test → Analyze → Adapt loop.
 * Called from Home on mount and after each quiz.
 */
export async function tickLearningLoop(): Promise<StudentProfile | null> {
  // 1. Refresh recommendations based on latest data
  await runProactiveAgent();
  // 2. Return latest profile for the UI
  return await getStudentProfile();
}

export async function nextStep(topicId: string | null) {
  const decision = await getAdaptiveDecision(topicId, "next_difficulty");
  return decision;
}