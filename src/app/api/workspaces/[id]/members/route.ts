import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { canAccessWorkspace, isWorkspaceOwner } from "@/lib/workspace";

export const dynamic = "force-dynamic";

// GET /api/workspaces/:id/members -> members + pending invites
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ws.type === "personal")
    return NextResponse.json({ error: "Personal workspace" }, { status: 400 });
  if (!(await canAccessWorkspace(userId, id)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: id },
    include: { user: true },
  });
  const invitations = await prisma.invitation.findMany({
    where: { workspaceId: id },
  });

  return NextResponse.json({
    isOwner: ws.ownerId === userId,
    ownerId: ws.ownerId,
    members: members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      name: m.user.name,
      email: m.user.email,
      role: ws.ownerId === m.userId ? "owner" : m.role,
    })),
    invitations: invitations.map((i) => ({ email: i.email })),
  });
}

// POST /api/workspaces/:id/members { identifier }  (owner invites by username/email)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await isWorkspaceOwner(userId, id)))
    return NextResponse.json({ error: "Only the owner can invite" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const identifier = String(body.identifier || "").trim().toLowerCase();
  if (!identifier)
    return NextResponse.json({ error: "username or email required" }, { status: 400 });

  const target = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });

  if (target) {
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: target.id } },
    });
    if (existing)
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    await prisma.workspaceMember.create({
      data: { workspaceId: id, userId: target.id, role: "member" },
    });
    return NextResponse.json({ added: true, username: target.username });
  }

  // Not registered yet -> pending invite by email (only if it looks like email)
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier))
    return NextResponse.json(
      { error: "No user with that username. Invite by email to pre-invite." },
      { status: 404 }
    );

  await prisma.invitation
    .upsert({
      where: { workspaceId_email: { workspaceId: id, email: identifier } },
      create: { workspaceId: id, email: identifier, invitedBy: userId },
      update: {},
    })
    .catch(() => {});
  return NextResponse.json({ pending: true, email: identifier });
}

// DELETE /api/workspaces/:id/members?userId=xxx  or ?email=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({ where: { id } });
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const targetUserId = req.nextUrl.searchParams.get("userId");
  const targetEmail = req.nextUrl.searchParams.get("email");
  const owner = ws.ownerId === userId;

  // Cancel a pending invite (owner only)
  if (targetEmail) {
    if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.invitation
      .deleteMany({ where: { workspaceId: id, email: targetEmail.toLowerCase() } })
      .catch(() => {});
    return NextResponse.json({ ok: true });
  }

  // Remove a member: owner can remove anyone (except themselves);
  // a member can remove themselves (leave).
  if (!targetUserId)
    return NextResponse.json({ error: "userId or email required" }, { status: 400 });
  if (targetUserId === ws.ownerId)
    return NextResponse.json(
      { error: "Owner cannot be removed. Delete the workspace instead." },
      { status: 400 }
    );
  if (!owner && targetUserId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.workspaceMember
    .deleteMany({ where: { workspaceId: id, userId: targetUserId } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
