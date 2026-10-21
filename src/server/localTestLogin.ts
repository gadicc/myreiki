import {
  createBetterAuthLocalTestLoginHandler,
  isBetterAuthLocalTestLoginEnabled,
} from "@gadicc/loom/next/auth";
import { db } from "@/db/runtime";
import { account, user } from "@/db/schema/auth";
import { sqlAuth } from "./sqlAuth";

export const localTestLoginEnabled = isBetterAuthLocalTestLoginEnabled(
  process.env,
);
export const localIdentities = {
  practitioner: {
    email: "myreiki-ui-a@example.test",
    name: "Synthetic Practitioner A",
    defaultCallbackURL: "/practices",
  },
  other: {
    email: "myreiki-ui-b@example.test",
    name: "Synthetic Practitioner B",
    defaultCallbackURL: "/practices",
  },
};

/** The Loom handler rejects deployed/non-loopback requests before this fixture can run. */
export const localTestLogin = createBetterAuthLocalTestLoginHandler({
  auth: sqlAuth,
  env: process.env,
  identities: localIdentities,
  async provisionIdentity({ identity, passwordHash }) {
    await db.transaction(async (tx) => {
      const [owner] = await tx
        .insert(user)
        .values({
          name: identity.name,
          email: identity.email,
          emailVerified: true,
          admin: false,
          practitioner: true,
        })
        .onConflictDoUpdate({
          target: user.email,
          set: { name: identity.name, admin: false, practitioner: true },
        })
        .returning();
      await tx
        .insert(account)
        .values({
          userId: owner.id,
          providerId: "credential",
          accountId: owner.id,
          password: passwordHash,
        })
        .onConflictDoUpdate({
          target: [account.providerId, account.accountId],
          set: { password: passwordHash, updatedAt: new Date() },
        });
    });
  },
});
