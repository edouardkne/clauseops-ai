
import { createClient } from "./server";

export async function requireApiUser(): Promise<Response | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims?.sub) {
      return Response.json(
        { error: "Authentication required." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return null;
  } catch {
    return Response.json(
      { error: "Authentication unavailable." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
