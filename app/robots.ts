import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // All bots: allow public pages, block private app routes and API
        userAgent: "*",
        allow: [
          "/",
          "/discover",
          "/pricing",
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
          "/write",
          "/write/",
          "/papers/upload",
          "/offline",
        ],
        crawlDelay: 2,
      },
      {
        // AI crawlers — same rules but explicitly stated so they follow them
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web", "Bytespider"],
        allow: ["/", "/discover", "/pricing", "/exams/"],
        disallow: ["/api/", "/dashboard", "/profile", "/mark", "/study", "/write"],
      },
    ],
    sitemap: "https://tausi.app/sitemap.xml",
    host: "https://tausi.app",
  };
}
