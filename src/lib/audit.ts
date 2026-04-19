import { prisma } from "./db";

export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  before?: object | null,
  after?: object | null
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      before: before ?? undefined,
      after: after ?? undefined,
    },
  });
}
