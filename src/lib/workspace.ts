import { prisma } from "./prisma";

/**
 * Ensure a user has a Personal workspace. If NO team exists yet (first-ever
 * user), create a default Team owned by them and adopt any legacy
 * (null-workspace) collections/environments into it. Then auto-accept any
 * pending email invitations for this user.
 */
export async function ensureUserWorkspaces(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // Personal workspace
  let personal = await prisma.workspace.findFirst({
    where: { type: "personal", ownerId: userId },
  });
  if (!personal) {
    personal = await prisma.workspace.create({
      data: { name: "Personal", type: "personal", ownerId: userId },
    });
  }

  // Bootstrap: only the very first user gets an auto-created Team (to hold
  // any pre-existing/adopted data). Everyone else joins teams via invites.
  const anyTeam = await prisma.workspace.findFirst({ where: { type: "team" } });
  if (!anyTeam) {
    const team = await prisma.workspace.create({
      data: { name: "Team", type: "team", ownerId: userId },
    });
    await prisma.workspaceMember
      .create({ data: { workspaceId: team.id, userId, role: "owner" } })
      .catch(() => {});
    await prisma.collection.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: team.id, ownerId: userId, visibility: "shared" },
    });
    await prisma.environment.updateMany({
      where: { workspaceId: null },
      data: { workspaceId: team.id, ownerId: userId, visibility: "shared" },
    });
  }

  // Accept any pending invitations addressed to this user's email.
  await acceptPendingInvites(userId, user.email);
}

/** Turn pending email invitations into memberships. */
export async function acceptPendingInvites(userId: string, email: string) {
  const invites = await prisma.invitation.findMany({
    where: { email: email.toLowerCase() },
  });
  for (const inv of invites) {
    await prisma.workspaceMember
      .upsert({
        where: {
          workspaceId_userId: { workspaceId: inv.workspaceId, userId },
        },
        create: { workspaceId: inv.workspaceId, userId, role: "member" },
        update: {},
      })
      .catch(() => {});
    await prisma.invitation.delete({ where: { id: inv.id } }).catch(() => {});
  }
}

/** All workspaces the user can access: personal (owned) + teams they belong to. */
export async function accessibleWorkspaces(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const teamIds = memberships.map((m) => m.workspaceId);
  return prisma.workspace.findMany({
    where: {
      OR: [{ type: "personal", ownerId: userId }, { id: { in: teamIds } }],
    },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
}

export async function accessibleWorkspaceIds(userId: string): Promise<string[]> {
  const ws = await accessibleWorkspaces(userId);
  return ws.map((w) => w.id);
}

/** Can this user read the given workspace? */
export async function canAccessWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) return false;
  if (ws.type === "personal") return ws.ownerId === userId;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return !!member;
}

/** Is the user the owner of this workspace? */
export async function isWorkspaceOwner(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  return !!ws && ws.ownerId === userId;
}

/**
 * Prisma `where` fragment limiting collections/environments to those the user
 * may see: inside an accessible workspace AND (shared OR owned by user).
 */
export function visibilityWhere(userId: string, workspaceIds: string[]) {
  return {
    workspaceId: { in: workspaceIds },
    OR: [{ visibility: "shared" }, { ownerId: userId }],
  };
}
