import {
  addLoomPwaSkipWaitingListener,
  createLoomPwaSerwistOptions,
} from "@gadicc/loom/next/pwa/worker";
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript.
// `injectionPoint` is the string that will be replaced by the
// actual precache manifest. By default, this string is set to
// `"self.__SW_MANIFEST"`.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist(
  createLoomPwaSerwistOptions({
    precacheEntries: self.__SW_MANIFEST,
    runtimeCaching: [
      {
        matcher: ({ url }) =>
          url.origin === self.location.origin &&
          url.pathname.startsWith("/api/"),
        handler: new NetworkOnly(),
      },
      ...defaultCache,
    ],
  }),
);

serwist.addEventListeners();
addLoomPwaSkipWaitingListener(self);

// Retire any API responses cached by an older service worker. Private domain
// records belong only in the owner-scoped IndexedDB store.
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const request of await cache.keys())
          if (new URL(request.url).pathname.startsWith("/api/"))
            await cache.delete(request);
      }
    })(),
  ),
);
