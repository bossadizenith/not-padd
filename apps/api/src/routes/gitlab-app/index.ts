import { db } from "@notpadd/db";
import { gitlabAppIntegration, member, organization } from "@notpadd/db/schema";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import type { ReqVariables } from "../../hono/index.js";

const gitlabAppRoutes = new Hono<{ Variables: ReqVariables }>();

const isUserOwner = async (
  c: Context<{ Variables: ReqVariables }>,
  organizationId: string,
) => {
  const currentUser = c.get("user");
  if (!currentUser || !currentUser.id) {
    return false;
  }

  const dbMember = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(
        eq(member.userId, currentUser.id),
        eq(member.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (!dbMember || !dbMember[0]) {
    return false;
  }

  // Check if role includes "owner" (roles can be comma-separated)
  const roles = dbMember[0].role?.split(",") || [];
  return roles.includes("owner");
};

gitlabAppRoutes.get("/", async (c) => {
  const user = c.get("user");
  if (!user || !user.id) {
    return c.json({ error: "Unauthorized", success: false }, 401);
  }

  const [integration] = await db
    .select()
    .from(gitlabAppIntegration)
    .where(eq(gitlabAppIntegration.userId, user.id));

  return c.json({ success: true, data: integration });
});

gitlabAppRoutes.post("/connect/:organizationId", async (c) => {
  const { organizationId } = c.req.param();
  const { repositoryId } = await c.req.json();
  const user = c.get("user");
  if (!user || !user.id) {
    return c.json({ error: "Unauthorized", success: false }, 401);
  }

  if (!organizationId) {
    return c.json(
      { error: "Organization ID is required", success: false },
      400,
    );
  }

  if (repositoryId === undefined) {
    return c.json({ error: "Repository ID is required", success: false }, 400);
  }

  const integration = await db
    .select()
    .from(gitlabAppIntegration)
    .where(eq(gitlabAppIntegration.userId, user.id));

  if (!integration) {
    return c.json({ error: "Integration not found", success: false }, 404);
  }

  const isUserOwnerResult = await isUserOwner(c, organizationId);
  if (!isUserOwnerResult) {
    return c.json(
      { error: "User not owner of organization", success: false },
      403,
    );
  }

  // We set repoProvider to 'gitlab' since we're connecting a gitlab repo
  const [updatedOrganization] = await db
    .update(organization)
    .set({ repoUrl: repositoryId, repoProvider: "gitlab" })
    .where(eq(organization.id, organizationId))
    .returning({ id: organization.id });

  if (!updatedOrganization) {
    return c.json(
      { error: "Failed to update organization", success: false },
      500,
    );
  }

  return c.json({
    success: true,
    message: "Repository connected successfully",
    data: updatedOrganization,
  });
});
export { gitlabAppRoutes };
