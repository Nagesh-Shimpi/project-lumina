import { Sparkles } from "lucide-react";

export const SplashScreen = () => (
  <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-20 left-10 w-40 h-40 bg-primary/40 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-32 right-10 w-48 h-48 bg-accent/40 rounded-full blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
    </div>
    <div className="relative z-10 flex flex-col items-center gap-6 animate-scale-in">
      <div className="w-24 h-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-[0_20px_60px_-10px_hsl(258_90%_66%/0.6)] animate-float">
        <Sparkles className="w-12 h-12 text-white" strokeWidth={2.5} />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold gradient-text">Lumina</h1>
        <p className="text-sm text-muted-foreground mt-2 tracking-wide">Your AI Tutor, Reimagined</p>
      </div>
      <div className="absolute -bottom-32 flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary animate-typing" />
        <span className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: "0.2s" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-typing" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  </div>
);
