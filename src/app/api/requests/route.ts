import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/requests -> save (create) a request into a collection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.collectionId) {
      return NextResponse.json(
        { error: "collectionId is required" },
        { status: 400 }
      );
    }
    const count = await prisma.request.count({
      where: { collectionId: body.collectionId },
    });
    const created = await prisma.request.create({
      data: {
        collectionId: body.collectionId,
        name: body.name?.trim() || "Untitled Request",
        method: body.method || "GET",
        url: body.url || "",
        description: body.description ?? "",
        params: body.params ?? [],
        headers: body.headers ?? [],
        auth: body.auth ?? {},
        body: body.body ?? {},
        preRequestScript: body.preRequestScript ?? "",
        testScript: body.testScript ?? "",
        order: count,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
