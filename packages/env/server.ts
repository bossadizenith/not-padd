import { createEnv as createEnvCore } from "@t3-oss/env-core";
import { config } from "dotenv";
import { resolve } from "path";
import BASE_ENV from "./base.js";
import { z } from "zod";

// Load environment variables from root .env file
config({ path: resolve(process.cwd(), ".env") });

export const env = createEnvCore({
  ...BASE_ENV,
  runtimeEnv: process.env,

  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    DATABASE_URL: z.url(),

    // Authentication
    BETTER_AUTH_SECRET: z.string(),
    BETTER_AUTH_URL: z.url(),

    // OAuth Providers
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),

    // GitHub App
    GITHUB_APP_CLIENT_ID: z.string(),
    GITHUB_APP_CLIENT_SECRET: z.string().optional(),
    GITHUB_APP_ID: z.string(),
    GITHUB_APP_PRIVATE_KEY: z.string(),

    // GitLab App
    GITLAB_CLIENT_ID: z.string(),
    GITLAB_CLIENT_SECRET: z.string(),
    GITLAB_REDIRECT_URI: z.string().url(),

    // Server Configuration
    BACKEND_URL: z.string(),
    FRONTEND_URL: z.string(),
    TRUSTED_ORIGINS: z
      .string()
      .transform((val) => val.trim())
      .refine(
        (val) => {
          if (val === "*") return true;
          const origins = val.split(",").map((s) => s.trim());
          return origins.every((origin) => {
            try {
              z.url().parse(origin);
              return true;
            } catch {
              return false;
            }
          });
        },
        {
          message: 'Must be "*" or a comma-separated list of valid URLs',
        },
      )
      .transform((val) => {
        if (val === "*") return ["*"];
        return val.split(",").map((s) => s.trim());
      }),

    // Email
    EMAIL_FROM: z.email(),
    RESEND_API_KEY: z.string(),

    // Upstash (Redis)
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  },
});

export type ENV = typeof env;
