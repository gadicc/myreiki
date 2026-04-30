import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import {
  addLoomPwaSkipWaitingListener,
  createLoomPwaSerwistOptions,
} from "@gadicc/loom/next/pwa/worker";

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
    runtimeCaching: defaultCache,
  }),
);

serwist.addEventListeners();
addLoomPwaSkipWaitingListener(self);
