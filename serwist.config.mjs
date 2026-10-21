import { serwist } from "@serwist/next/config";

export default serwist({
  esbuildOptions: {
    target: "es2022",
  },
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});
