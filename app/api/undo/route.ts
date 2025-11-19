import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      // Find the most recent undo log for this user that hasn't expired
      const undoLog = await prisma.undoLog.findFirst({
        where: {
          userId: sess.user.id,
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

      if (!undoLog) {
        return createApiError('No action available to undo or undo window expired', 400);
      }

      // Perform undo based on action type
      let undoResult = null;

      switch (undoLog.action) {
        case 'update_lead': {
          const previousState = undoLog.previousState as Record<string, unknown>;
          undoResult = await prisma.lead.update({
            where: { id: undoLog.targetId },
            data: {
              name: previousState.name as string,
              phone: previousState.phone as string,
              email: previousState.email as string | null,
              status: previousState.status as string,
              priority: previousState.priority as string,
              notes: previousState.notes as string | null,
              // Add other fields as needed
            },
          });
          break;
        }

        case 'delete_lead': {
          const previousState = undoLog.previousState as Record<string, unknown>;
          undoResult = await prisma.lead.create({
            data: {
              id: undoLog.targetId,
              name: previousState.name as string,
              phone: previousState.phone as string,
              email: previousState.email as string | null,
              source: previousState.source as string,
              status: previousState.status as string,
              priority: previousState.priority as string,
              assignedToId: previousState.assignedToId as string | null,
              createdById: previousState.createdById as string | null,
              notes: previousState.notes as string | null,
              // Add other fields as needed
            },
          });
          break;
        }

        case 'assign_lead': {
          const previousState = undoLog.previousState as Record<string, unknown>;
          undoResult = await prisma.lead.update({
            where: { id: undoLog.targetId },
            data: {
              assignedToId: previousState.assignedToId as string | null,
            },
          });
          break;
        }

        default:
          return createApiError('Undo not supported for this action', 400);
      }

      // Mark undo log as completed
      await prisma.undoLog.update({
        where: { id: undoLog.id },
        data: {
          canUndo: false,
          undoneAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'undo',
          userId: sess.user.id,
          targetType: undoLog.targetType,
          targetId: undoLog.targetId,
          changes: {
            undoAction: undoLog.action,
            previousState: undoLog.previousState,
          },
        },
      });

      return createApiResponse(
        {
          action: undoLog.action,
          targetType: undoLog.targetType,
          targetId: undoLog.targetId,
          result: undoResult,
        },
        'Action undone successfully'
      );
    } catch (error) {
      console.error('Undo error:', error);
      return createApiError('Failed to undo action', 500);
    }
  });
}

// Get available undo actions
export async function GET(request: NextRequest) {
  return withAuth(async (session) => {
    try {
      const sess = session as Session;

      const undoLogs = await prisma.undoLog.findMany({
        where: {
          userId: sess.user.id,
          canUndo: true,
          undoneAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      });

      return createApiResponse(undoLogs);
    } catch (error) {
      console.error('Get undo logs error:', error);
      return createApiError('Failed to fetch undo actions', 500);
    }
  });
}
