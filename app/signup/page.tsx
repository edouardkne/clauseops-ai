
import Link from "next/link";
import { signUp } from "@/app/auth/actions";

type Props = {
  searchParams: Promise<{ message?: string }>;
};

export default async function SignupPage({
  searchParams,
}: Props) {
  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-indigo-700">
          ClauseOps AI
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Start your contract intelligence workspace.
        </p>

        {message && (
          <p
            role="alert"
            className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          >
            {message === "invalid"
              ? "Please enter a valid email, a full name, and a password of 8–128 characters."
              : message === "config"
                ? "Registration is temporarily unavailable. Please try again later."
                : "Registration could not be completed. Please try again."}
          </p>
        )}

        <form action={signUp} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-slate-800"
            >
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              maxLength={120}
              autoComplete="name"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="organization"
              className="block text-sm font-medium text-slate-800"
            >
              Organization (optional)
            </label>
            <input
              id="organization"
              name="organization"
              type="text"
              maxLength={160}
              autoComplete="organization"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="professional_role"
              className="block text-sm font-medium text-slate-800"
            >
              Professional role (optional)
            </label>
            <input
              id="professional_role"
              name="professional_role"
              type="text"
              maxLength={120}
              autoComplete="organization-title"
              placeholder="e.g. Legal Officer, Compliance Analyst"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
          </div>

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
              minLength={8}
              maxLength={128}
              required
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900"
            />
            <p className="mt-2 text-xs text-slate-500">
              Use between 8 and 128 characters.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-700">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
