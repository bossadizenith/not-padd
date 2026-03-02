import { NextRequest, NextResponse } from "next/server";
import { getRepositoryContents } from "@/lib/gitlab";
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
    const projectId = searchParams.get("projectId");
    const path = searchParams.get("path") || "";

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameters", success: false },
        { status: 400 },
      );
    }

    const contents = await getRepositoryContents(
      session.user.id,
      projectId,
      path,
    );

    return NextResponse.json({
      success: true,
      data: contents,
    });
  } catch (error: any) {
    const status = error.message.includes("Path") ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to fetch contents", success: false },
      { status },
    );
  }
};
