import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: memory } = await supabase
      .from("student_memory").select("*").eq("user_id", user.id).maybeSingle();
    const { data: mistakes } = await supabase
      .from("mistakes").select("id,topic_id").eq("user_id", user.id).is("mastered_at", null);
    const { data: topics } = await supabase.from("topics").select("id,title,icon");

    const mastery = ((memory?.mastery as Record<string, any>) || {});
    const recs: any[] = [];

    // Rule 1: weak topic revision (highest priority)
    const weakest = Object.entries(mastery)
      .filter(([_, s]: any) => (s?.avg ?? 100) < 60 && (s?.attempts ?? 0) >= 1)
      .sort(([, a]: any, [, b]: any) => a.avg - b.avg)[0];
    if (weakest) {
      const t = topics?.find((x: any) => x.id === weakest[0]);
      if (t) recs.push({
        kind: "revise",
        topic_id: t.id,
        message: `Let's revise ${t.icon} ${t.title} — you scored ${Math.round((weakest[1] as any).avg)}% last time. A quick refresh will help!`,
        cta_label: `Revise ${t.title}`,
        priority: 1,
      });
    }

    // Rule 2: retry mistakes
    if ((mistakes?.length ?? 0) >= 3) {
      recs.push({
        kind: "retry_mistakes",
        topic_id: null,
        message: `You have ${mistakes!.length} questions to master. Want to retry them now?`,
        cta_label: "Retry mistakes",
        priority: 2,
      });
    }

    // Rule 3: level up if mastery is high
    const strong = Object.values(mastery).filter((s: any) => (s?.avg ?? 0) >= 80).length;
    if (strong >= 2 && memory?.current_difficulty !== "advanced") {
      recs.push({
        kind: "level_up",
        topic_id: null,
        message: `You're doing great! Try harder questions at ${memory?.current_difficulty === "beginner" ? "intermediate" : "advanced"} level.`,
        cta_label: "Level up",
        priority: 3,
      });
    }

    // Rule 4: continue last topic
    if (memory?.last_topic_id) {
      const t = topics?.find((x: any) => x.id === memory.last_topic_id);
      if (t) recs.push({
        kind: "continue",
        topic_id: t.id,
        message: `Continue your session on ${t.icon} ${t.title}?`,
        cta_label: `Continue ${t.title}`,
        priority: 4,
      });
    }

    // Mark old recs consumed, insert fresh ones
    if (recs.length) {
      await supabase.from("tutor_recommendations")
        .update({ consumed_at: new Date().toISOString() })
        .eq("user_id", user.id).is("consumed_at", null);
      await supabase.from("tutor_recommendations").insert(
        recs.map((r) => ({ ...r, user_id: user.id })),
      );
    }

    return new Response(JSON.stringify({ created: recs.length, recommendations: recs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tutor-proactive error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});