import { getLeagues } from "@/lib/queries";
import { SITE_URL } from "@/lib/site";

export default async function sitemap() {
  const leagues = getLeagues();

  const staticRoutes = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 1.0 },
    { url: `${SITE_URL}/leagues`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${SITE_URL}/accuracy`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    { url: `${SITE_URL}/methodology`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${SITE_URL}/value`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.8 },
    { url: `${SITE_URL}/articles`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${SITE_URL}/news`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.6 },
  ];

  const leagueRoutes = leagues.map((l) => ({
    url: `${SITE_URL}/leagues/${l.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...leagueRoutes];
}
