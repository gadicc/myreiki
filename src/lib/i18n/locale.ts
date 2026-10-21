import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { localeCookie, resolveLocale } from "./languages";

export const getLocale = cache(async () =>
  resolveLocale(
    (await cookies()).get(localeCookie)?.value,
    (await headers()).get("accept-language") ?? "",
  ),
);
