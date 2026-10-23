
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ============================================
// CLAUSEOPS AI — AUTHENTICATION SERVER ACTIONS
// Supabase Auth + Next.js 16
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

  // Validate input
  if (!email || !password) {
    redirect("/login?message=required");
  }

  if (!isValidEmail(email)) {
    redirect("/login?message=invalid");
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  // Never expose detailed authentication errors
  if (error || !data.session) {
    redirect("/login?message=invalid");
  }

  // Refresh authenticated server components
  revalidatePath("/", "layout");

  // Continue to the protected workspace
  redirect("/contracts/upload");
}

// ============================================
// 2. SIGN UP
// ============================================

export async function signUp(formData: FormData) {
  // Account credentials
  const email = getEmail(formData);
  const password = String(formData.get("password") ?? "");

  // Personal information
  const fullName = String(
    formData.get("full_name") ?? ""
  ).trim();

  const organization = String(
    formData.get("organization") ?? ""
  ).trim();

  const professionalRole = String(
    formData.get("professional_role") ?? ""
  ).trim();

  // Validate account credentials
  if (
    !isValidEmail(email) ||
    password.length < 8 ||
    password.length > 128
  ) {
    redirect("/signup?message=invalid");
  }

  // Validate personal information
  if (
    !fullName ||
    fullName.length > 120 ||
    organization.length > 160 ||
    professionalRole.length > 120
  ) {
    redirect("/signup?message=invalid");
  }

  const supabase = await createClient();

  // Fixed application origin, not taken from user input
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000";

  const confirmationUrl = new URL(
    "/auth/callback",
    appUrl
  ).toString();

  // Create account and store profile metadata
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

  // If email confirmation is disabled and Supabase
  // creates an active session immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/contracts/upload");
  }

  // Email confirmation required
  redirect("/login?message=check-email");
}

// ============================================
// 3. SIGN OUT
// ============================================

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  // Clear authenticated server-rendered state
  revalidatePath("/", "layout");

  redirect("/login");
}
