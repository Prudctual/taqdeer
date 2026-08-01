import { getLeagues } from "@/lib/queries";

const BASE = "https://taqdeer.app";

export default async function sitemap() {
  const leagues = getLeagues();

  const staticRoutes = [
    { url: BASE, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 1.0 },
    { url: `${BASE}/leagues`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/accuracy`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${BASE}/methodology`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/value`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.8 },
    { url: `${BASE}/articles`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${BASE}/news`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.6 },
  ];

  const leagueRoutes = leagues.map((l) => ({
    url: `${BASE}/leagues/${l.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...leagueRoutes];
}
