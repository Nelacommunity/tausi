import type { MetadataRoute } from "next";
import { SITE_URL, siteUrl } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // All bots: allow public pages, block private app routes and API
        userAgent: "*",
        allow: [
          "/",
          "/discover",
          "/signup",
          "/exams/",   // public exam pages indexed individually
        ],
        disallow: [
          "/api/",
          "/dashboard",
          "/dashboard/",
          "/profile",
          "/mark",
          "/mark/",
          "/study",
          "/study/",
          "/papers/upload",
          "/offline",
        ],
        crawlDelay: 2,
      },
      {
        // AI crawlers — same rules but explicitly stated so they follow them
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web", "Bytespider"],
        allow: ["/", "/discover", "/exams/"],
        disallow: ["/api/", "/dashboard", "/profile", "/mark", "/study"],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
