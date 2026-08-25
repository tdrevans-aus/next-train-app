import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tdrevans.nexttrain",
  appName: "Next Train",
  webDir: "public",
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
