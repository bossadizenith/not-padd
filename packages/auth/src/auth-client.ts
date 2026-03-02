import { createAuthClient } from "better-auth/react";
import { env } from "@notpadd/env/client";
import { organizationClient } from "better-auth/client/plugins";
import { ac, member, admin, owner } from "./permission";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BACKEND_URL,
  plugins: [
    organizationClient({
      ac,
      roles: { owner, admin, member },
      schema: {
        organization: {
          additionalFields: {
            lastUsed: { type: "boolean", required: false },
            repoProvider: { type: "string", required: false },
            repoUrl: { type: "string", required: false },
            repoPath: { type: "string", required: false },
            storageLimit: { type: "number", required: false },
            storageUsed: { type: "number", required: false },
          },
        },
      },
    }),
  ],
});
