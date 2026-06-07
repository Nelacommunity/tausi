import { Polar } from "@polar-sh/sdk";

const server =
  (process.env.POLAR_SERVER as "sandbox" | "production" | undefined) ?? "sandbox";

export const api = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server,
});
