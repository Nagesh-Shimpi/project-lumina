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

    const { topic_id, action } = await req.json().catch(() => ({}));
    const { data: memory } = await supabase
      .from("student_memory").select("*").eq("user_id", user.id).maybeSingle();

    const mastery = ((memory?.mastery as Record<string, any>) || {});
    const topicStats = topic_id ? mastery[topic_id] : null;
    const overall = memory?.current_difficulty || "beginner";

    let recommendedDifficulty = overall;
    let strategy: "teach" | "practice" | "revise" = "practice";

    if (topicStats) {
      if (topicStats.avg < 40) { recommendedDifficulty = "beginner"; strategy = "revise"; }
      else if (topicStats.avg < 70) { strategy = "practice"; }
      else { strategy = "practice"; }
    } else {
      strategy = "teach";
    }

    const shouldFocusMistakes = action === "should_revise"
      ? (topicStats ? topicStats.avg < 60 : false)
      : false;

    return new Response(JSON.stringify({
      difficulty: recommendedDifficulty,
      strategy,
      shouldFocusMistakes,
      topicStats: topicStats || null,
      overall,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("tutor-adaptive error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});