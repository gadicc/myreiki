"use client";

import { createSettledSessionHook } from "@gadicc/loom/next/auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { sqlAuth } from "@/server/sqlAuth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof sqlAuth>()],
});

export const useAuthSession = createSettledSessionHook(authClient.useSession);
