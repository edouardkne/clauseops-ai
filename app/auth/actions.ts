
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ============================================
// CLAUSEOPS AI — AUTHENTICATION SERVER ACTIONS
// ============================================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmail(formData: FormData): string {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

// ============================================
// 1. SIGN IN
// ============================================

export async function signIn(formData: FormData) {
  const email = getEmail(formData);
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?message=required");
  }

  if (!isValidEmail(email)) {
    redirect("/login?message=invalid");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    redirect("/login?message=invalid");
  }

  revalidatePath("/", "layout");
  redirect("/contracts/upload");
}

// ============================================
// 2. SIGN UP
// ============================================

export async function signUp(formData: FormData) {
  const email = getEmail(formData);
  const password = String(formData.get("password") ?? "");

  const fullName = String(
    formData.get("full_name") ?? ""
  ).trim();

  const organization = String(
    formData.get("organization") ?? ""
  ).trim();

  const professionalRole = String(
    formData.get("professional_role") ?? ""
  ).trim();

  if (
    !isValidEmail(email) ||
    password.length < 8 ||
    password.length > 128
  ) {
    redirect("/signup?message=invalid");
  }

  if (
    !fullName ||
    fullName.length > 120 ||
    organization.length > 160 ||
    professionalRole.length > 120
  ) {
    redirect("/signup?message=invalid");
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!configuredAppUrl && process.env.NODE_ENV === "production") {
    redirect("/signup?message=config");
  }

  const appUrl = configuredAppUrl || "http://localhost:3000";

  let confirmationUrl: string;

  try {
    const origin = new URL(appUrl);

    if (
      !["http:", "https:"].includes(origin.protocol) ||
      (process.env.NODE_ENV === "production" &&
        origin.protocol !== "https:")
    ) {
      redirect("/signup?message=config");
    }

    confirmationUrl = new URL("/auth/callback", origin).toString();
  } catch (error) {
    // Next.js redirects throw internally; do not swallow them.
    if (
      error instanceof Error &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    redirect("/signup?message=config");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmationUrl,
      data: {
        full_name: fullName,
        organization: organization || null,
        professional_role: professionalRole || null,
      },
    },
  });

  if (error) {
    redirect("/signup?message=failed");
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/contracts/upload");
  }

  redirect("/login?message=check-email");
}

// ============================================
// 3. SIGN OUT
// ============================================

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
