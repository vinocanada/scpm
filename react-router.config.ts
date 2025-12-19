import type { Config } from "@react-router/dev/config";

export default {
  // SSR for Cloudflare deploy, SPA build for Android (Capacitor requires index.html in webDir)
  ssr: process.env.CAPACITOR !== "1",
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
