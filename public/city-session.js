/**
 * Multi-city session: Sydney, Brisbane, and Adelaide use production Vercel APIs.
 * Local debug can still probe a LAN dev server. Never silent-switch after an explicit pick.
 */
(function () {
  const LIVE_CITY = "perth";
  const MULTI_CITY_IDS = ["sydney", "brisbane", "adelaide", "uk-london-tfl", "amsterdam", "rotterdam", "vancouver", "canberra", "gold-coast", "newcastle", "auckland", "goteborg"];
  const VERCEL_ORIGIN = "https://next-train-app.vercel.app";
  const SETTINGS_KEY = "nextTrainSettings";

  const COUNTRIES = [
    {
      id: "au",
      name: "Australia",
      regions: [
        { id: "perth", name: "Perth", timeZone: "Australia/Perth" },
        { id: "sydney", name: "Sydney", timeZone: "Australia/Sydney" },
        { id: "newcastle", name: "Newcastle", timeZone: "Australia/Sydney" },
        { id: "brisbane", name: "Brisbane", timeZone: "Australia/Brisbane" },
        { id: "gold-coast", name: "Gold Coast", timeZone: "Australia/Brisbane" },
        { id: "adelaide", name: "Adelaide", timeZone: "Australia/Adelaide" },
        { id: "canberra", name: "Canberra", timeZone: "Australia/Sydney" },
        { id: "melbourne", name: "Melbourne", timeZone: "Australia/Melbourne", comingSoon: true },
      ],
    },
    {
      id: "nz",
      name: "New Zealand",
      regions: [
        { id: "auckland", name: "Auckland", timeZone: "Pacific/Auckland" },
        { id: "wellington", name: "Wellington", timeZone: "Pacific/Auckland", comingSoon: true },
      ],
    },
    {
      id: "gb",
      name: "England",
      regions: [
        { id: "uk-west-midlands", name: "West Midlands", timeZone: "Europe/London", comingSoon: true },
        { id: "uk-ellesmere-port", name: "Ellesmere Port corridor", timeZone: "Europe/London", comingSoon: true },
        { id: "uk-london-tfl", name: "London", timeZone: "Europe/London" },
      ],
    },
    {
      id: "nl",
      name: "Netherlands",
      regions: [
        { id: "amsterdam", name: "Amsterdam", timeZone: "Europe/Amsterdam" },
        { id: "rotterdam", name: "Rotterdam", timeZone: "Europe/Amsterdam" },
      ],
    },
    {
      id: "se",
      name: "Sweden",
      regions: [
        { id: "stockholm", name: "Stockholm", timeZone: "Europe/Stockholm", comingSoon: true },
        { id: "goteborg", name: "Göteborg", timeZone: "Europe/Stockholm" },
      ],
    },
    {
      id: "ca",
      name: "Canada",
      regions: [
        { id: "vancouver", name: "Vancouver", timeZone: "America/Vancouver" },
      ],
    },
    {
      id: "jp",
      name: "Japan",
      regions: [
        { id: "osaka", name: "Osaka", timeZone: "Asia/Tokyo", comingSoon: true },
      ],
    },

    {
      id: "hk",
      name: "Hong Kong",
      regions: [
        { id: "hong-kong", name: "Hong Kong", timeZone: "Asia/Hong_Kong", comingSoon: true },
      ],
    },
