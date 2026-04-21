import { supabase } from "@/integrations/supabase/client";

export async function runProactiveAgent() {
  const { data, error } = await supabase.functions.invoke("tutor-proactive", { body: {} });
  if (error) console.error("proactive agent", error);
  return data;
}