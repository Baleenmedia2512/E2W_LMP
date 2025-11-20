import { NextRequest } from 'next/server';
import { withRole, createApiResponse, createApiError } from '@/lib/api-middleware';
import prisma from '@/lib/prisma';
import { Session } from 'next-auth';

/**
 * Meta Configuration API
 * Only accessible by SuperAgent role
 */

// ============================================
// GET - Fetch Meta Configuration
// ============================================
export async function GET(request: NextRequest) {
  return withRole(['SuperAgent'], async (session) => {
    try {
      const configs = await prisma.metaConfig.findMany({
        select: {
          id: true,
          pageId: true,
          pageName: true,
          verifyToken: true,
          isActive: true,
          lastVerified: true,
          createdAt: true,
          updatedAt: true,
          // Don't expose access token in list
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return createApiResponse(configs);
    } catch (error) {
      console.error('Get Meta config error:', error);
      return createApiError('Failed to fetch Meta configuration', 500);
    }
  });
}

// ============================================
// POST - Create/Update Meta Configuration
// ============================================
export async function POST(request: NextRequest) {
  return withRole(['SuperAgent'], async (session) => {
    try {
      const sess = session as Session;
      const body = await request.json();

      const { pageId, pageName, pageAccessToken, verifyToken } = body;

      // Validate required fields
      if (!pageId || !pageAccessToken || !verifyToken) {
        return createApiError(
          'pageId, pageAccessToken, and verifyToken are required',
          400
        );
      }

      // Test the access token by making a test call to Meta
      try {
        const testResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${pageAccessToken}`
        );

        if (!testResponse.ok) {
          return createApiError('Invalid access token', 400);
        }
      } catch (error) {
        return createApiError('Failed to validate access token', 400);
      }

      // Check if config exists for this pageId
      const existing = await prisma.metaConfig.findUnique({
        where: { pageId },
      });

      let config;

      if (existing) {
        // Update existing
        config = await prisma.metaConfig.update({
          where: { pageId },
          data: {
            pageName: pageName || existing.pageName,
            pageAccessToken,
            verifyToken,
            isActive: true,
            lastVerified: new Date(),
            updatedAt: new Date(),
          },
          select: {
            id: true,
            pageId: true,
            pageName: true,
            verifyToken: true,
            isActive: true,
            lastVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } else {
        // Deactivate all other configs (only one can be active)
        await prisma.metaConfig.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });

        // Create new
        config = await prisma.metaConfig.create({
          data: {
            pageId,
            pageName,
            pageAccessToken,
            verifyToken,
            isActive: true,
            lastVerified: new Date(),
          },
          select: {
            id: true,
            pageId: true,
            pageName: true,
            verifyToken: true,
            isActive: true,
            lastVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'meta_config_update',
          userId: sess.user.id,
          targetType: 'MetaConfig',
          targetId: config.id,
          changes: {
            pageId,
            pageName,
          },
        },
      });

      return createApiResponse(config, 'Meta configuration saved successfully');
    } catch (error) {
      console.error('Save Meta config error:', error);
      return createApiError('Failed to save Meta configuration', 500);
    }
  });
}

// ============================================
// DELETE - Delete Meta Configuration
// ============================================
export async function DELETE(request: NextRequest) {
  return withRole(['SuperAgent'], async (session) => {
    try {
      const sess = session as Session;
      const searchParams = request.nextUrl.searchParams;
      const configId = searchParams.get('id');

      if (!configId) {
        return createApiError('Config ID is required', 400);
      }

      await prisma.metaConfig.delete({
        where: { id: configId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'meta_config_delete',
          userId: sess.user.id,
          targetType: 'MetaConfig',
          targetId: configId,
          changes: {},
        },
      });

      return createApiResponse(
        { success: true },
        'Meta configuration deleted successfully'
      );
    } catch (error) {
      console.error('Delete Meta config error:', error);
      return createApiError('Failed to delete Meta configuration', 500);
    }
  });
}
