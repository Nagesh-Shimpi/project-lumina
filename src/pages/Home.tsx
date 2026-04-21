import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Send, Loader2, ImageIcon, Mic, MicOff, Volume2, Download, User } from "lucide-react";
import { toast } from "sonner";
import { useStudent } from "@/hooks/useStudent";
import { useAuth } from "@/hooks/useAuth";
import { TutorBanner } from "@/components/tutor/TutorBanner";
import { WeakTopicsStrip } from "@/components/tutor/WeakTopicsStrip";
import { useAppState } from "@/hooks/useAppState";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const IMAGE_TRIGGERS = /\b(generate|create|draw|show|make|render)\b.*\b(image|picture|illustration|diagram|drawing|photo|pic)\b/i;

type Msg = { role: "user" | "assistant"; content: string; imageUrl?: string };

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Help me practice algebra",
  "Generate an image of the solar system",
  "Quiz me on world history",
];

const Home = () => {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const { profile: student, dismiss, refresh } = useStudent();
  const { setSelectedTopicId } = useAppState();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Inject a personalized greeting once when student data lands and chat is empty
  useEffect(() => {
    if (!user || greeted || messages.length > 0 || !student) return;
    const top = student.recommendations[0];
    const name = authProfile?.display_name?.split(" ")[0] || "there";
    const greetingText = top
      ? `👋 Welcome back, ${name}! ${top.message}`
      : (student.memory?.total_quizzes ?? 0) > 0
      ? `👋 Hey ${name}! Ready to keep learning? You're at ${student.memory?.current_difficulty} level.`
      : `👋 Hi ${name}! I'm your AI tutor. Ask me anything, and I'll remember your progress and adapt as we go.`;
    setMessages([{ role: "assistant", content: greetingText }]);
    setGreeted(true);
  }, [student, user, authProfile, messages.length, greeted]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Voice input not supported");
    if (listening) { recognitionRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "en-US"; r.interimResults = false;
    r.onresult = (e: any) => setInput((p) => (p ? p + " " : "") + e.results[0][0].transcript);
    r.onerror = () => { setListening(false); toast.error("Voice error"); };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    setListening(true);
    r.start();
  };

  const generateImage = async (prompt: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.error || "Image generation failed");
        return;
      }
      setMessages((p) => [...p, { role: "assistant", content: `Here's your image: ${prompt}`, imageUrl: data.imageUrl }]);
    } catch {
      toast.error("Network error");
    } finally { setLoading(false); }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);

    if (imageMode || IMAGE_TRIGGERS.test(text)) {
      setImageMode(false);
      await generateImage(text);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          studentContext: student ? {
            displayName: authProfile?.display_name,
            difficulty: student.memory?.current_difficulty,
            weakTopics: student.weakTopics.map((w) => w.title),
            lastTopic: student.lastTopic?.title,
            totalQuizzes: student.memory?.total_quizzes,
            recentMistakes: student.mistakes.slice(0, 3).map((m) => m.question),
          } : undefined,
        }),
      });
      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit hit. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Something went wrong.");
        setLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", assistant = "", done = false;
      setMessages((p) => [...p, { role: "assistant", content: "" }]);
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setMessages((p) => p.map((m, i) => i === p.length - 1 ? { ...m, content: assistant } : m));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch {
      toast.error("Network error");
    } finally { setLoading(false); }
  };

  const hasChat = messages.length > 0;

  return (
    <main className="min-h-screen w-full flex flex-col">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 max-w-6xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-[0_8px_24px_-8px_hsl(258_90%_66%/0.6)]">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-lg">AI Tutor</span>
        </div>
        <button
          onClick={() => navigate("/app")}
          className="glass rounded-full px-4 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:scale-105 transition-transform"
        >
          Open App <ArrowRight className="w-3 h-3" />
        </button>
      </header>

      {/* Hero / Chat */}
      <section className="flex-1 flex flex-col items-center px-4 md:px-6 pt-4 pb-6 max-w-3xl mx-auto w-full">
        {user && <TutorBanner
          profile={student}
          onAction={(rec) => {
            if (rec.topic_id) {
              setSelectedTopicId(rec.topic_id);
              navigate("/app");
              toast.success(`Opened ${rec.cta_label || "topic"} in the app — head to the Topic or Quiz phone.`);
            } else if (rec.kind === "retry_mistakes") {
              navigate("/app");
              toast.success("Open the Quiz phone to retry your saved mistakes.");
            } else if (rec.kind === "level_up") {
              toast.success("Difficulty bumped! Your next quiz will be harder. 🚀");
            }
            dismiss(rec.id);
            refresh();
          }}
          onDismiss={dismiss}
        />}
        {user && <WeakTopicsStrip
          profile={student}
          onPickTopic={(id) => { setSelectedTopicId(id); navigate("/app"); toast.success("Topic selected — open Topic or Quiz phone in the app."); }}
          onRetryMistakes={() => { navigate("/app"); toast.success("Open the Quiz phone to retry your saved mistakes."); }}
        />}
        {!hasChat && (
          <div className="text-center pt-8 md:pt-16 pb-8">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground">Powered by Lumina · 2026</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-display font-bold leading-[1.05] mb-4">
              <span className="gradient-text">AI Tutor</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-2">Your Smart Learning Assistant</p>
            <p className="text-sm text-muted-foreground/80 max-w-lg mx-auto">
              Ask anything. Learn anything. Voice, text, and images — all in one place.
            </p>
          </div>
        )}

        {/* Chat messages */}
        {hasChat && (
          <div ref={scrollRef} className="w-full flex-1 overflow-y-auto scrollbar-hide space-y-3 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 animate-fade-in ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 max-w-[80%]">
                  <div className={
                    m.role === "user"
                      ? "bg-gradient-primary text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md whitespace-pre-wrap shadow-md"
                      : "glass-card text-sm px-4 py-2.5 rounded-2xl rounded-bl-md whitespace-pre-wrap"
                  }>
                    {m.content || <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  </div>
                  {m.imageUrl && (
                    <div className="space-y-1">
                      <img src={m.imageUrl} alt="Generated" className="rounded-xl border border-border/40 max-w-full" />
                      <a href={m.imageUrl} download={`ai-tutor-${Date.now()}.png`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent">
                        <Download className="w-3 h-3" /> Save image
                      </a>
                    </div>
                  )}
                  {m.role === "assistant" && m.content && !m.imageUrl && (
                    <button onClick={() => speak(m.content)}
                      className="self-start text-xs text-muted-foreground hover:text-accent flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Play
                    </button>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full glass flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-glow animate-typing" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-glow animate-typing" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-glow animate-typing" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div className="w-full max-w-2xl mt-4">
          <div className="glass-card rounded-3xl p-2 flex items-center gap-1.5 shadow-[0_20px_60px_-20px_hsl(258_90%_66%/0.4)]">
            <button
              onClick={() => setImageMode((v) => !v)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${imageMode ? "bg-gradient-primary text-white" : "glass text-muted-foreground hover:text-foreground"}`}
              title="Generate image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={imageMode ? "Describe an image..." : "Ask me anything..."}
              className="flex-1 bg-transparent outline-none text-sm md:text-base px-2 py-2.5 placeholder:text-muted-foreground min-w-0"
            />
            <button
              onClick={startListening}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${listening ? "bg-destructive text-white animate-pulse" : "glass text-muted-foreground hover:text-foreground"}`}
              title={listening ? "Stop listening" : "Voice input"}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="h-10 px-4 rounded-2xl bg-gradient-primary text-white text-sm font-semibold flex items-center gap-2 hover:scale-[1.03] transition-transform shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {!hasChat && (
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="glass rounded-full px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:scale-105 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-6 pt-4 text-xs text-muted-foreground">
        Created by <span className="font-semibold text-foreground/90">Nagesh Shimpi</span>
      </footer>
    </main>
  );
};

export default Home;
