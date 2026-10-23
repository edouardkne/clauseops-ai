
import Link from "next/link";
import { signIn } from "@/app/auth/actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({
  searchParams,
}: Props) {
  const { message } = await searchParams;

  // Authentication messages
  const notices: Record<string, string> = {
    required:
      "Please enter your email and password.",

    invalid:
      "Invalid email or password, or email not confirmed.",

    "check-email":
      "Check your inbox to confirm your account before signing in.",

    confirmed:
      "Email confirmed. You can now sign in.",

    "confirmation-failed":
      "Email confirmation failed or the link has expired. Please sign in or request a new confirmation email.",
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="text-sm font-semibold text-indigo-700"
        >
          ClauseOps AI
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Welcome back
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Sign in to your contract intelligence workspace.
        </p>

        {/* Authentication notifications */}
        {message && notices[message] && (
          <p
            role="status"
            className="mt-5 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900"
          >
            {notices[message]}
          </p>
        )}

        {/* Sign in form */}
        <form action={signIn} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-800"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-800"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Sign in
          </button>
        </form>

        {/* Registration link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          New to ClauseOps?{" "}
          <Link
            href="/signup"
            className="font-semibold text-indigo-700"
          >
            Create account
          </Link>
        </p>
      </section>
    </main>
  );
}
