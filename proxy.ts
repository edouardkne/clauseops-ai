
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    }
  );

  // Validate the signed authentication token.
  const { data, error } = await supabase.auth.getClaims();

  const isAuthenticated = !error && Boolean(data?.claims?.sub);

  if (!isAuthenticated) {
    const pathname = request.nextUrl.pathname;

    // API requests must receive an error, not an HTML login page.
    if (pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );

      unauthorized.headers.set("Cache-Control", "no-store");

      response.cookies.getAll().forEach((cookie) => {
        unauthorized.cookies.set(cookie);
      });

      return unauthorized;
    }

    // Redirect visitors to the login page.
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const redirectResponse = NextResponse.redirect(loginUrl);

    redirectResponse.headers.set(
      "Cache-Control",
      "private, no-store"
    );

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/contracts/:path*",
    "/obligations/:path*",
    "/evidence/:path*",
    "/assistant/:path*",
    "/calendar/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
