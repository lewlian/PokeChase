import { getServerSupabase } from "@/lib/supabase/server";
import { redirectToPath } from "@/lib/http-redirect";

export async function POST() {
  const supabase = await getServerSupabase();
  if (supabase) await supabase.auth.signOut();
  // 303 so the browser follows with GET after the POST
  return redirectToPath("/", 303);
}
