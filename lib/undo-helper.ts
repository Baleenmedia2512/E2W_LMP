import prisma from '@/lib/prisma';

interface CreateUndoLogParams {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  previousState: Record<string, unknown>;
  expirationSeconds?: number;
}

/**
 * Create an undo log entry for a reversible action
 * @param params - Parameters for creating the undo log
 * @returns The created undo log
 */
export async function createUndoLog({
  userId,
  action,
  targetType,
  targetId,
  previousState,
  expirationSeconds = 60, // Default 60 seconds to undo
}: CreateUndoLogParams) {
  const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

  const undoLog = await prisma.undoLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      previousState,
      expiresAt,
      canUndo: true,
    },
  });

  return undoLog;
}

/**
 * Cancel (expire) all pending undo logs for a specific target
 * Useful when an entity is permanently deleted or modified in a way that makes undo impossible
 */
export async function cancelUndoLogs(targetType: string, targetId: string) {
  await prisma.undoLog.updateMany({
    where: {
      targetType,
      targetId,
      canUndo: true,
      undoneAt: null,
    },
    data: {
      canUndo: false,
      expiresAt: new Date(), // Expire immediately
    },
  });
}

/**
 * Get the most recent undoable action for a user
 */
export async function getLatestUndoLog(userId: string) {
  return await prisma.undoLog.findFirst({
    where: {
      userId,
      canUndo: true,
      undoneAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}
