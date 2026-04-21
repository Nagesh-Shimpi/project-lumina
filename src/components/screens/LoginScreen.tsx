import { Mail, Lock, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const LoginScreen = () => {
  const { user, profile, signOut } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) { toast.error("Fill all fields"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Lumina! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in!");
      }
    } catch (e: any) {
      toast.error(e.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="relative flex-1 flex flex-col p-6 pt-14 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/30 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 mt-6">
          <h2 className="text-2xl font-display font-bold">You're in! ✨</h2>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-semibold mt-1 truncate">{profile?.display_name || user.email}</p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{user.email}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] glass rounded-full px-2 py-0.5">{profile?.xp ?? 0} XP</span>
              <span className="text-[10px] glass rounded-full px-2 py-0.5">🔥 {profile?.streak ?? 0} day streak</span>
            </div>
          </div>
          <button onClick={signOut} className="glass-card rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-medium">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
          <p className="text-[10px] text-muted-foreground text-center">Browse the other phones — they're all live now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col p-5 pt-12 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/30 rounded-full blur-3xl" />
      <div className="relative z-10 flex flex-col gap-4 mt-2">
        <div>
          <h2 className="text-2xl font-display font-bold">{mode === "signin" ? "Welcome back" : "Create account"}</h2>
          <p className="text-xs text-muted-foreground mt-1">{mode === "signin" ? "Sign in to continue" : "Start learning today"}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {mode === "signup" && (
            <div className="glass-card rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
              <span className="text-xs">👤</span>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Name" className="bg-transparent outline-none text-xs flex-1 placeholder:text-muted-foreground" />
            </div>
          )}
          <div className="glass-card rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="email@example.com" className="bg-transparent outline-none text-xs flex-1 placeholder:text-muted-foreground" />
          </div>
          <div className="glass-card rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" className="bg-transparent outline-none text-xs flex-1 placeholder:text-muted-foreground" />
          </div>
        </div>

        <button onClick={submit} disabled={loading} className="w-full py-3 rounded-2xl bg-gradient-primary text-white font-semibold text-xs shadow-[0_10px_30px_-8px_hsl(258_90%_66%/0.6)] hover:scale-[1.02] transition-transform disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {mode === "signin" ? "Sign In" : "Sign Up"}
        </button>

        <p className="text-[11px] text-center text-muted-foreground mt-2">
          {mode === "signin" ? "New here? " : "Have an account? "}
          <button onClick={()=>setMode(mode === "signin" ? "signup" : "signin")} className="text-primary-glow font-semibold">
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};
