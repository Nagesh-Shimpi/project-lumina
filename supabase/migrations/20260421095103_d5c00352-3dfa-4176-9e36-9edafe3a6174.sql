
-- 1. student_memory
CREATE TABLE public.student_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_difficulty text NOT NULL DEFAULT 'beginner',
  last_topic_id uuid,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  total_quizzes integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  mastery jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own memory" ON public.student_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own memory" ON public.student_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own memory" ON public.student_memory FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_student_memory_updated_at
BEFORE UPDATE ON public.student_memory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. mistakes
CREATE TABLE public.mistakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  wrong_index integer,
  correct_index integer NOT NULL,
  correct_answer text,
  explanation text,
  times_seen integer NOT NULL DEFAULT 1,
  mastered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mistakes" ON public.mistakes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mistakes" ON public.mistakes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mistakes" ON public.mistakes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mistakes" ON public.mistakes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_mistakes_user_topic ON public.mistakes(user_id, topic_id);

CREATE TRIGGER trg_mistakes_updated_at
BEFORE UPDATE ON public.mistakes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. tutor_recommendations
CREATE TABLE public.tutor_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  topic_id uuid,
  message text NOT NULL,
  cta_label text,
  priority integer NOT NULL DEFAULT 5,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutor_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recs" ON public.tutor_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own recs" ON public.tutor_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own recs" ON public.tutor_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own recs" ON public.tutor_recommendations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_recs_user_active ON public.tutor_recommendations(user_id, consumed_at, priority);

-- 4. Trigger: when quiz_attempts inserted, update student_memory
CREATE OR REPLACE FUNCTION public.handle_quiz_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pct numeric;
  v_new_diff text;
  v_current text;
  v_mastery jsonb;
  v_topic_key text;
  v_topic_stats jsonb;
  v_attempts int;
  v_avg numeric;
BEGIN
  v_pct := CASE WHEN NEW.total > 0 THEN (NEW.score::numeric / NEW.total) * 100 ELSE 0 END;
  v_topic_key := NEW.topic_id::text;

  -- Ensure memory row exists
  INSERT INTO public.student_memory (user_id, last_topic_id)
  VALUES (NEW.user_id, NEW.topic_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT current_difficulty, mastery INTO v_current, v_mastery
  FROM public.student_memory WHERE user_id = NEW.user_id;

  -- Per-topic mastery
  v_topic_stats := COALESCE(v_mastery -> v_topic_key, '{"attempts":0,"avg":0,"last_pct":0}'::jsonb);
  v_attempts := COALESCE((v_topic_stats->>'attempts')::int, 0) + 1;
  v_avg := ((COALESCE((v_topic_stats->>'avg')::numeric, 0) * (v_attempts - 1)) + v_pct) / v_attempts;

  v_topic_stats := jsonb_build_object(
    'attempts', v_attempts,
    'avg', round(v_avg, 1),
    'last_pct', round(v_pct, 1),
    'last_at', to_jsonb(now())
  );
  v_mastery := COALESCE(v_mastery, '{}'::jsonb) || jsonb_build_object(v_topic_key, v_topic_stats);

  -- Adapt difficulty
  v_new_diff := v_current;
  IF v_pct >= 80 AND v_current = 'beginner' THEN v_new_diff := 'intermediate';
  ELSIF v_pct >= 80 AND v_current = 'intermediate' THEN v_new_diff := 'advanced';
  ELSIF v_pct <= 40 AND v_current = 'advanced' THEN v_new_diff := 'intermediate';
  ELSIF v_pct <= 40 AND v_current = 'intermediate' THEN v_new_diff := 'beginner';
  END IF;

  UPDATE public.student_memory
  SET total_quizzes = total_quizzes + 1,
      total_correct = total_correct + NEW.score,
      total_questions = total_questions + NEW.total,
      last_topic_id = NEW.topic_id,
      last_activity_at = now(),
      current_difficulty = v_new_diff,
      mastery = v_mastery
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_quiz_attempt
AFTER INSERT ON public.quiz_attempts
FOR EACH ROW EXECUTE FUNCTION public.handle_quiz_attempt();
