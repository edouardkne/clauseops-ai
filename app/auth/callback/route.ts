
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirectWithoutCache(
  request: Request,
  pathname: string
) {
  const response = NextResponse.redirect(
    new URL(pathname, request.url)
  );

  response.headers.set(
    "Cache-Control",
    "private, no-store"
  );

  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Reject missing confirmation codes.
  if (!code) {
    return redirectWithoutCache(
      request,
      "/login?message=confirmation-failed"
    );
  }

  try {
    const supabase = await createClient();

    // Exchange the one-time PKCE code for a session.
    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectWithoutCache(
        request,
        "/login?message=confirmation-failed"
      );
    }

    // Confirm that Supabase recognizes the user.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectWithoutCache(
        request,
        "/login?message=confirmation-failed"
      );
    }

    // Never expose the confirmation code in the final URL.
    return redirectWithoutCache(
      request,
      "/contracts/upload"
    );
  } catch {
    return redirectWithoutCache(
      request,
      "/login?message=confirmation-failed"
    );
  }
}
