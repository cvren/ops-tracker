"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession } from "@/lib/auth";
import { INITIAL_ACTION_STATE, type ActionState } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth";

export async function signInAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email and password.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase()
    }
  });

  if (!user) {
    return {
      ...INITIAL_ACTION_STATE,
      status: "error",
      message: "No account matched those credentials."
    };
  }

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return {
      status: "error",
      message: "No account matched those credentials."
    };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signOutAction() {
  await destroySession();
  redirect("/login");
}
