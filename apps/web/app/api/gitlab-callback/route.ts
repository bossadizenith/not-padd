import { NextRequest, NextResponse } from "next/server";
import { handleGitlabOAuthCallback } from "@/lib/gitlab";
import { auth } from "@notpadd/auth/auth";
import { headers } from "next/headers";

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(
        "/error?message=Missing authorization code or state",
        request.url,
      ),
    );
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL(`/${state}/settings/general?error=Unauthorized`, request.url),
    );
  }

  try {
    const success = await handleGitlabOAuthCallback(code, session.user.id);

    if (!success) {
      return NextResponse.redirect(
        new URL(
          `/${state}/settings/general?error=Failed to create GitLab integration`,
          request.url,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(`/${state}/settings/general`, request.url),
    );
  } catch (error: any) {
    return NextResponse.redirect(
      new URL(`/${state}/settings/general?error=${error.message}`, request.url),
    );
  }
};
