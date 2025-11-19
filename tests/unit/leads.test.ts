import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '@/lib/prisma';
import { createLeadSchema, assignLeadSchema } from '@/lib/validations';

describe('Lead Management', () => {
  let testUser: { id: string };
  let testRole: { id: string };

  beforeAll(async () => {
    // Create test role and user
    testRole = await prisma.role.create({
      data: {
        name: 'Agent',
        description: 'Test agent role',
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        roleId: testRole.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    await prisma.role.deleteMany({ where: { name: 'Agent' } });
    await prisma.$disconnect();
  });

  describe('Lead Creation', () => {
    it('should validate lead creation schema', () => {
      const validLead = {
        name: 'John Doe',
        phone: '+919876543210',
        email: 'john@example.com',
        source: 'Website',
        status: 'new' as const,
      };

      const result = createLeadSchema.safeParse(validLead);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const invalidLead = {
        name: 'John Doe',
        phone: 'invalid-phone',
        source: 'Website',
      };

      const result = createLeadSchema.safeParse(invalidLead);
      expect(result.success).toBe(false);
    });

    it('should create lead in database', async () => {
      const lead = await prisma.lead.create({
        data: {
          name: 'Test Lead',
          phone: '+919876543210',
          email: 'testlead@example.com',
          source: 'Test',
          createdById: testUser.id,
        },
      });

      expect(lead.id).toBeDefined();
      expect(lead.name).toBe('Test Lead');

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
    });
  });

  describe('Lead Assignment', () => {
    it('should validate assignment schema', () => {
      const validAssignment = {
        leadId: 'cltest123',
        assignedToId: 'cltest456',
      };

      const result = assignLeadSchema.safeParse(validAssignment);
      expect(result.success).toBe(true);
    });

    it('should assign lead to user', async () => {
      const lead = await prisma.lead.create({
        data: {
          name: 'Assignment Test Lead',
          phone: '+919876543211',
          source: 'Test',
          createdById: testUser.id,
        },
      });

      const updated = await prisma.lead.update({
        where: { id: lead.id },
        data: { assignedToId: testUser.id },
      });

      expect(updated.assignedToId).toBe(testUser.id);

      // Cleanup
      await prisma.lead.delete({ where: { id: lead.id } });
    });
  });
});
