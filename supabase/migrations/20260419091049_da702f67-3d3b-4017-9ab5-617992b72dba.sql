
-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Learner',
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Topics
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  icon TEXT NOT NULL DEFAULT '📘',
  color TEXT NOT NULL DEFAULT 'from-primary to-primary-glow',
  lesson_content TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics public read" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users create topics" ON public.topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions public read" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Authenticated users create questions" ON public.quiz_questions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own messages" ON public.chat_messages FOR DELETE USING (auth.uid() = user_id);

-- 6. Topic progress
CREATE TABLE public.topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_id)
);
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own progress" ON public.topic_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.topic_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.topic_progress FOR UPDATE USING (auth.uid() = user_id);

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Seed topics
INSERT INTO public.topics (id, title, description, category, difficulty, icon, color, lesson_content) VALUES
('11111111-1111-1111-1111-111111111111','Algebra Basics','Master variables, equations & expressions','Math','beginner','🔢','from-purple-500 to-pink-500','Algebra uses letters (variables) to represent numbers. The core idea: keep both sides of an equation balanced. If you do something to one side, do it to the other.

Example: To solve x + 5 = 12, subtract 5 from both sides → x = 7.

Key concepts: variables, coefficients, constants, like terms, the distributive property a(b+c) = ab + ac.'),
('22222222-2222-2222-2222-222222222222','Cell Biology','Discover the building blocks of life','Science','beginner','🧬','from-emerald-500 to-teal-500','Cells are the basic unit of life. There are two main types: prokaryotic (bacteria, no nucleus) and eukaryotic (plants/animals, with nucleus).

Key organelles: nucleus (DNA), mitochondria (energy), ribosomes (protein synthesis), chloroplasts (photosynthesis in plants).

Cells communicate via signaling molecules and divide through mitosis.'),
('33333333-3333-3333-3333-333333333333','World War II','Key events that shaped history','History','intermediate','📜','from-amber-500 to-orange-500','WWII (1939-1945) was the deadliest conflict in history. It began with Germany invading Poland and ended with the surrender of Japan after atomic bombings.

Key turning points: Battle of Britain (1940), Pearl Harbor (1941), Stalingrad (1942-43), D-Day (1944).

Outcomes: founding of the UN, start of the Cold War, decolonization.'),
('44444444-4444-4444-4444-444444444444','JavaScript Fundamentals','Variables, functions & async basics','Coding','beginner','💻','from-yellow-500 to-amber-500','JavaScript is the language of the web. Core concepts:

• Variables: let, const, var
• Functions: function declarations and arrow functions ()=>{}
• Async: Promises and async/await for handling asynchronous operations
• Objects & Arrays: the main data structures

Example: const greet = (name) => `Hello, ${name}!`;'),
('55555555-5555-5555-5555-555555555555','English Grammar','Tenses, clauses & punctuation','English','beginner','📖','from-blue-500 to-cyan-500','English grammar revolves around verb tenses (past, present, future) and sentence structure (subject + verb + object).

Key topics: parts of speech (nouns, verbs, adjectives, adverbs), independent vs dependent clauses, correct use of commas and apostrophes.

Tip: A complete sentence needs at least a subject and a verb.'),
('66666666-6666-6666-6666-666666666666','World Geography','Continents, capitals & climates','Geography','beginner','🌍','from-rose-500 to-pink-500','Earth has 7 continents and 5 oceans. The largest country by area is Russia; by population, India.

Climate zones: tropical, temperate, polar, arid. Climate is shaped by latitude, altitude, ocean currents, and prevailing winds.

The equator divides Earth into Northern and Southern hemispheres.');

-- 10. Seed quiz questions (5 per topic)
-- Algebra
INSERT INTO public.quiz_questions (topic_id, question, options, correct_index, explanation, position) VALUES
('11111111-1111-1111-1111-111111111111','Solve: x + 7 = 15','["6","7","8","9"]'::jsonb,2,'15 - 7 = 8',1),
('11111111-1111-1111-1111-111111111111','What is 3(x + 2) expanded?','["3x+2","3x+6","x+6","3x+5"]'::jsonb,1,'Distribute: 3·x + 3·2 = 3x+6',2),
('11111111-1111-1111-1111-111111111111','If 2x = 14, then x = ?','["6","7","8","12"]'::jsonb,1,'Divide both sides by 2',3),
('11111111-1111-1111-1111-111111111111','Simplify: 5x + 3x','["8x","15x","8","5x3x"]'::jsonb,0,'Combine like terms',4),
('11111111-1111-1111-1111-111111111111','Solve: x/4 = 5','["1","9","20","25"]'::jsonb,2,'Multiply both sides by 4',5),
-- Cell Biology
('22222222-2222-2222-2222-222222222222','Powerhouse of the cell?','["Nucleus","Mitochondria","Ribosome","Vacuole"]'::jsonb,1,'Mitochondria produce ATP energy',1),
('22222222-2222-2222-2222-222222222222','Which cells lack a nucleus?','["Eukaryotic","Prokaryotic","Plant","Animal"]'::jsonb,1,'Prokaryotes (bacteria) have no nucleus',2),
('22222222-2222-2222-2222-222222222222','Where does photosynthesis occur?','["Mitochondria","Chloroplast","Nucleus","Lysosome"]'::jsonb,1,'Chloroplasts contain chlorophyll',3),
('22222222-2222-2222-2222-222222222222','DNA is stored in the?','["Cytoplasm","Membrane","Nucleus","Ribosome"]'::jsonb,2,'The nucleus protects genetic material',4),
('22222222-2222-2222-2222-222222222222','Cell division is called?','["Meiosis only","Mitosis","Osmosis","Diffusion"]'::jsonb,1,'Mitosis produces two identical cells',5),
-- WWII
('33333333-3333-3333-3333-333333333333','When did WWII begin?','["1914","1939","1941","1945"]'::jsonb,1,'Germany invaded Poland in Sept 1939',1),
('33333333-3333-3333-3333-333333333333','D-Day landings happened in?','["Italy","Normandy","Greece","Spain"]'::jsonb,1,'June 6, 1944 in Normandy, France',2),
('33333333-3333-3333-3333-333333333333','Pearl Harbor was attacked by?','["Germany","Italy","Japan","USSR"]'::jsonb,2,'Dec 7, 1941',3),
('33333333-3333-3333-3333-333333333333','WWII ended in?','["1943","1944","1945","1946"]'::jsonb,2,'Japan surrendered in Sept 1945',4),
('33333333-3333-3333-3333-333333333333','UN was founded after WWII in?','["1944","1945","1948","1950"]'::jsonb,1,'Founded October 24, 1945',5),
-- JavaScript
('44444444-4444-4444-4444-444444444444','Which keyword declares a constant?','["var","let","const","def"]'::jsonb,2,'const cannot be reassigned',1),
('44444444-4444-4444-4444-444444444444','typeof [] returns?','["array","object","list","undefined"]'::jsonb,1,'Arrays are objects in JS',2),
('44444444-4444-4444-4444-444444444444','=== compares?','["values only","types only","value AND type","references"]'::jsonb,2,'Strict equality',3),
('44444444-4444-4444-4444-444444444444','Which is async?','["forEach","await fetch()","map","filter"]'::jsonb,1,'fetch returns a Promise',4),
('44444444-4444-4444-4444-444444444444','Arrow function syntax?','["function()=>{}","()=>{}","=>()","->{}"]'::jsonb,1,'(args) => expression',5),
-- English
('55555555-5555-5555-5555-555555555555','Past tense of \"run\"?','["runned","ran","run","running"]'::jsonb,1,'Irregular verb',1),
('55555555-5555-5555-5555-555555555555','Which is a noun?','["quickly","happiness","run","blue"]'::jsonb,1,'Names a thing/concept',2),
('55555555-5555-5555-5555-555555555555','\"Their/There/They''re\" — possessive?','["Their","There","They''re","All"]'::jsonb,0,'Their = belonging to them',3),
('55555555-5555-5555-5555-555555555555','A complete sentence needs?','["Just a noun","Subject + verb","Adjective","Comma"]'::jsonb,1,'Minimum requirement',4),
('55555555-5555-5555-5555-555555555555','Adverbs usually modify?','["Nouns","Verbs","Pronouns","Articles"]'::jsonb,1,'Often end in -ly',5),
-- Geography
('66666666-6666-6666-6666-666666666666','Largest country by area?','["China","USA","Russia","Canada"]'::jsonb,2,'~17 million km²',1),
('66666666-6666-6666-6666-666666666666','Longest river?','["Amazon","Nile","Yangtze","Mississippi"]'::jsonb,1,'~6,650 km',2),
('66666666-6666-6666-6666-666666666666','Capital of Australia?','["Sydney","Melbourne","Canberra","Perth"]'::jsonb,2,'Not Sydney!',3),
('66666666-6666-6666-6666-666666666666','How many continents?','["5","6","7","8"]'::jsonb,2,'7 continents',4),
('66666666-6666-6666-6666-666666666666','Sahara is in which continent?','["Asia","Africa","Australia","S. America"]'::jsonb,1,'Largest hot desert',5);
