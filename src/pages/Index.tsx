import { PhoneFrame } from "@/components/PhoneFrame";
import { SplashScreen } from "@/components/screens/SplashScreen";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { ChatScreen } from "@/components/screens/ChatScreen";
import { TopicScreen } from "@/components/screens/TopicScreen";
import { QuizScreen } from "@/components/screens/QuizScreen";
import { ProgressScreen } from "@/components/screens/ProgressScreen";
import { Sparkles } from "lucide-react";

const screens = [
  { label: "Splash", node: <SplashScreen /> },
  { label: "Login", node: <LoginScreen /> },
  { label: "Home", node: <HomeScreen /> },
  { label: "AI Chat", node: <ChatScreen /> },
  { label: "Topic", node: <TopicScreen /> },
  { label: "Quiz", node: <QuizScreen /> },
  { label: "Progress", node: <ProgressScreen /> },
];

const Index = () => {
  return (
    <main className="min-h-screen w-full">
      {/* Hero */}
      <header className="relative px-6 pt-16 pb-10 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
          <span className="text-xs font-medium tracking-wide">AI-Powered Learning · 2026</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05]">
          Meet <span className="gradient-text">Lumina</span>
          <br />
          <span className="text-foreground/90">your virtual tutor.</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mt-5 max-w-xl mx-auto">
          A modern AI tutor app — clean, glass-morphic, and built to make learning feel effortless.
          The chat screen is wired to a real AI. Try it.
        </p>
      </header>

      {/* Phones grid */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-14">
          {screens.map((s, i) => (
            <PhoneFrame key={s.label} label={s.label} index={i}>
              {s.node}
            </PhoneFrame>
          ))}
        </div>
      </section>

      <footer className="text-center pb-10 text-xs text-muted-foreground">
        Designed with glassmorphism, gradients &amp; love · Lumina UI Kit
      </footer>
    </main>
  );
};

export default Index;
