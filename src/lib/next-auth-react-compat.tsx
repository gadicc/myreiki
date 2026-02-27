"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";

type CompatSession = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function useSession() {
  const sessionState = authClient.useSession();
  const data = (sessionState.data
    ? {
        user: {
          id: sessionState.data.user.id,
          name: sessionState.data.user.name,
          email: sessionState.data.user.email,
          image: sessionState.data.user.image,
        },
      }
    : null) as CompatSession | null;

  return {
    data,
    status: sessionState.isPending
      ? "loading"
      : data
        ? "authenticated"
        : "unauthenticated",
    async update() {
      await sessionState.refetch();
      return data;
    },
  };
}

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export async function signIn(
  provider?: string,
  _options?: Record<string, unknown>,
) {
  const selectedProvider = provider || "google";
  return await authClient.signIn.social({
    provider: selectedProvider as "google",
  });
}

export async function signOut(_options?: Record<string, unknown>) {
  return await authClient.signOut();
}
