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

    // Ensure memory row exists
    let { data: memory } = await supabase
      .from("student_memory").select("*").eq("user_id", user.id).maybeSingle();
    if (!memory) {
      const { data: created } = await supabase
        .from("student_memory").insert({ user_id: user.id }).select().single();
      memory = created;
    }

    const [{ data: mistakes }, { data: recs }, { data: topics }, { data: lastTopic }] = await Promise.all([
      supabase.from("mistakes").select("*").eq("user_id", user.id).is("mastered_at", null).order("created_at", { ascending: false }).limit(20),
      supabase.from("tutor_recommendations").select("*").eq("user_id", user.id).is("consumed_at", null).order("priority").order("created_at", { ascending: false }).limit(5),
      supabase.from("topics").select("id,title,icon,category,difficulty"),
      memory?.last_topic_id
        ? supabase.from("topics").select("id,title,icon").eq("id", memory.last_topic_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Compute weak topics from mastery
    const mastery = (memory?.mastery as Record<string, any>) || {};
    const weak = Object.entries(mastery)
      .filter(([_, s]: any) => (s?.avg ?? 100) < 60 && (s?.attempts ?? 0) >= 1)
      .map(([topicId, s]: any) => {
        const t = topics?.find((x: any) => x.id === topicId);
        return t ? { ...t, avg: s.avg, attempts: s.attempts } : null;
      })
      .filter(Boolean)
      .slice(0, 5);

    return new Response(JSON.stringify({
      memory,
      mistakes: mistakes || [],
      recommendations: recs || [],
      weakTopics: weak,
      lastTopic: lastTopic || null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("tutor-memory error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});