import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tdrevans.nexttrain",
  appName: "Next Train",
  webDir: "public",
  server: {
    url: "https://next-train-app.vercel.app",
    cleartext: false,
  },
};

export default config;
