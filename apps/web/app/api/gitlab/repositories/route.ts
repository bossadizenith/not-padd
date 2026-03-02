import { NextRequest, NextResponse } from "next/server";
import { getInstallationRepositories } from "@/lib/gitlab";
import { auth } from "@notpadd/auth/auth";
import { headers } from "next/headers";

export const GET = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const perPage = Number(searchParams.get("per_page")) || 10;

    const result = await getInstallationRepositories(session.user.id, {
      perPage,
      search,
    });

    return NextResponse.json({
      success: true,
      data: result.repositories,
      total: result.total,
    });
  } catch (error: any) {
    console.error("GitLab repos error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch repositories",
        success: false,
      },
      { status: 500 },
    );
  }
};
