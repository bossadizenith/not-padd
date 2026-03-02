import { db } from "@notpadd/db";
import schema, { member } from "@notpadd/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@notpadd/env/server";
import { organization } from "better-auth/plugins";
import { getActiveOrganization } from "./utils/org";
import { ac, member as memberRole, admin, owner } from "./permission";
import { and, eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { sendInvitationEmail } from "./utils/send-invitation-email";

type InvitationInsert = InferInsertModel<typeof schema.invitation>;

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),

  trustedOrigins: [env.FRONTEND_URL, env.BACKEND_URL],
  appName: "Notpadd",
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      accessType: "offline",
      prompt: "consent",
    },
  },

  advanced: {
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: "notpadd.com",
    },
  },
  verification: {
    disableCleanup: true,
  },
  plugins: [
    organization({
      ac,
      roles: { owner, admin, member: memberRole },
      schema: {
        organization: {
          additionalFields: {
            lastUsed: {
              type: "boolean",
              input: true,
              required: false,
            },
            repoProvider: {
              type: "string",
              input: true,
              required: false,
            },
            repoUrl: {
              type: "string",
              input: true,
              required: false,
            },
            repoPath: {
              type: "string",
              input: true,
              required: false,
            },
            storageLimit: {
              type: "number",
              input: true,
              required: false,
            },
            storageUsed: {
              type: "number",
              input: true,
              required: false,
            },
          },
        },
      },
      async sendInvitationEmail(data) {
        await sendInvitationEmail({
          id: data.id,
          email: data.email,
          inviter: {
            user: {
              name: data.inviter.user.name,
              email: data.inviter.user.email,
            },
          },
          organization: {
            name: data.organization.name,
          },
        });
      },
      organizationHooks: {
        beforeCreateInvitation: async ({
          invitation,
          inviter,
          organization,
        }) => {
          if (invitation.inviterId) {
            const memberById = await db.query.member.findFirst({
              where: and(
                eq(member.id, invitation.inviterId),
                eq(member.organizationId, organization.id),
              ),
            });

            if (memberById) {
              return { data: invitation };
            }

            const memberByUserId = await db.query.member.findFirst({
              where: and(
                eq(member.userId, invitation.inviterId),
                eq(member.organizationId, organization.id),
              ),
            });

            if (memberByUserId) {
              return {
                data: {
                  ...invitation,
                  inviterId: memberByUserId.id,
                },
              };
            }
          }
          let inviterMemberId: string | undefined;

          if (inviter?.id && typeof inviter.id === "string") {
            const memberRecord = await db.query.member.findFirst({
              where: and(
                eq(member.id, inviter.id),
                eq(member.organizationId, organization.id),
              ),
            });
            if (memberRecord) {
              inviterMemberId = memberRecord.id;
            } else {
              const memberByUserId = await db.query.member.findFirst({
                where: and(
                  eq(member.userId, inviter.id),
                  eq(member.organizationId, organization.id),
                ),
              });
              if (memberByUserId) {
                inviterMemberId = memberByUserId.id;
              }
            }
          }
          if (
            !inviterMemberId &&
            inviter?.userId &&
            typeof inviter.userId === "string"
          ) {
            const memberRecord = await db.query.member.findFirst({
              where: and(
                eq(member.userId, inviter.userId),
                eq(member.organizationId, organization.id),
              ),
            });
            if (memberRecord) {
              inviterMemberId = memberRecord.id;
            }
          }

          if (
            !inviterMemberId &&
            inviter?.user?.id &&
            typeof inviter.user.id === "string"
          ) {
            const memberRecord = await db.query.member.findFirst({
              where: and(
                eq(member.userId, inviter.user.id),
                eq(member.organizationId, organization.id),
              ),
            });
            if (memberRecord) {
              inviterMemberId = memberRecord.id;
            }
          }
          if (inviterMemberId) {
            return {
              data: {
                ...invitation,
                inviterId: inviterMemberId,
              },
            };
          }
          throw new Error(
            `Cannot determine member ID for inviter. Invitation inviterId: ${invitation.inviterId}, Inviter: ${JSON.stringify(inviter)}, Organization: ${organization.id}`,
          );
        },
      },
    }),
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const organization = await getActiveOrganization(session.userId);
          return {
            data: {
              ...session,
              activeOrganizationId: organization?.id,
            },
          };
        },
      },
    },
    invitation: {
      create: {
        before: async (invitation: InvitationInsert) => {
          if (!invitation.inviterId || !invitation.organizationId) {
            return { data: invitation };
          }

          const existingMember = await db.query.member.findFirst({
            where: and(
              eq(member.id, invitation.inviterId),
              eq(member.organizationId, invitation.organizationId),
            ),
          });

          if (existingMember) {
            return { data: invitation };
          }

          const memberByUserId = await db.query.member.findFirst({
            where: and(
              eq(member.userId, invitation.inviterId),
              eq(member.organizationId, invitation.organizationId),
            ),
          });

          if (memberByUserId) {
            return {
              data: {
                ...invitation,
                inviterId: memberByUserId.id,
              },
            };
          }

          throw new Error(
            `Invalid inviterId: ${invitation.inviterId} is not a valid member ID or user ID for organization ${invitation.organizationId}`,
          );
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
