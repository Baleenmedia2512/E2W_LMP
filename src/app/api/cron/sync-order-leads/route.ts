import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/shared/lib/db/prisma';
import { cleanPhoneNumber, isValidPhone } from '@/shared/utils/phone';
import mysql, { RowDataPacket } from 'mysql2/promise';

export const dynamic = 'force-dynamic';

interface OrderRow extends RowDataPacket {
  ClientContact: number;
  ClientName: string;
  Source: string;
  Card: string;
  OrderDate: string;
  City: string;
  State: string;
  Area: string;
  DoorStreet: string;
  PIN: string;
}

function mapSource(rawSource: string): string {
  if (!rawSource || !rawSource.trim()) return 'Direct';
  const s = rawSource.toLowerCase();
  if (s.includes('justdial') || s.includes('just dial')) return 'Just Dial';
  if (s.includes('sulekha')) return 'Sulekha';
  if (s.includes('indiamart')) return 'Indiamart';
  if (s.includes('consultant')) return 'Consultant';
  if (s.includes('website') || s.includes('web app') || s.includes('webapp') || s.includes('online')) return 'Website';
  if (s.includes('meta') || s.includes('facebook')) return 'Meta';
  if (s.includes('whatsapp')) return 'WhatsApp';
  if (s.includes('referral')) return 'Referral';
  if (s.includes(' lg') || s.includes('4.lg') || s.match(/\blg\b/)) return 'LG';
  if (s.includes('cold call')) return 'Cold Call';
  return 'Direct';
}

/**
 * Cron job: Sync stale clients from order_table as new leads
 * Schedule: 0 2 * * * (Daily at 2 AM)
 *
 * Logic:
 * 1. Query MySQL order_table for clients whose latest non-cancelled order is 30+ days old
 * 2. Cross-check against LMS Lead table by phone
 * 3. For missing ones → create as status="new", is_existing=true, auto-assigned via round-robin
 */
export async function GET(request: NextRequest) {
  // Security: verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const mysqlUrl = process.env.MYSQL_ORDER_DB_URL;
  if (!mysqlUrl) {
    return NextResponse.json(
      { success: false, error: 'MYSQL_ORDER_DB_URL is not configured' },
      { status: 500 }
    );
  }

  let connection: mysql.Connection | null = null;

  try {
    // Step 1: Connect to external MySQL DB
    connection = await mysql.createConnection(mysqlUrl);

    // Step 2: Run the 30-day stale client query
    const [rows] = await connection.execute<OrderRow[]>(`
      SELECT
        o.ClientContact,
        o.ClientName,
        o.Source,
        o.Card,
        o.OrderDate,
        o.City,
        o.State,
        o.Area,
        o.DoorStreet,
        o.PIN
      FROM order_table o
      INNER JOIN (
        SELECT
          ClientContact,
          MAX(OrderDate) AS LatestOrderDate
        FROM order_table
        WHERE CancelFlag = 0
          AND OrderDate <= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY ClientContact
      ) latest
        ON o.ClientContact = latest.ClientContact
        AND o.OrderDate = latest.LatestOrderDate
      WHERE o.CancelFlag = 0
        AND o.ClientContact > 0
    `);

    console.log(`[sync-order-leads] MySQL returned ${rows.length} rows`);

    if (!rows.length) {
      return NextResponse.json({
        success: true,
        checked: 0,
        alreadyExist: 0,
        newLeadsCreated: 0,
        message: 'No stale clients found in order_table',
      });
    }

    // Step 3: Normalize phones, deduplicate
    const seenPhones = new Set<string>();
    const validClients: Array<{
      phone: string;
      name: string;
      source: string;
      orderDate: string;
      city: string;
      state: string;
      address: string;
      pincode: string;
    }> = [];

    for (const row of rows) {
      const rawPhone = String(row.ClientContact);
      const phone = cleanPhoneNumber(rawPhone);

      if (!isValidPhone(phone)) continue;
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);

      const orderDate = row.OrderDate
        ? new Date(row.OrderDate).toISOString().split('T')[0]
        : '';
      const addressParts = [row.DoorStreet, row.Area].filter(Boolean);

      validClients.push({
        phone,
        name: (row.ClientName || '').trim() || 'Unknown',
        source: mapSource(row.Source || ''),
        orderDate,
        city: (row.City || '').trim(),
        state: (row.State || '').trim(),
        address: addressParts.join(', '),
        pincode: (row.PIN || '').trim(),
      });
    }

    console.log(`[sync-order-leads] ${validClients.length} valid unique clients after normalization`);

    // Step 4: Batch check which phones already exist in LMS
    const allPhones = validClients.map((c) => c.phone);
    const existingLeads = await prisma.lead.findMany({
      where: { phone: { in: allPhones } },
      select: { id: true, phone: true, assignedToId: true },
    });
    const existingPhoneSet = new Set(existingLeads.map((l) => l.phone));

    // Step 5: Filter to only truly new clients
    const newClients = validClients.filter((c) => !existingPhoneSet.has(c.phone));

    // Step 5b: Find existing leads that are unassigned (healer logic)
    const unassignedExisting = existingLeads.filter((l) => l.assignedToId === null);

    console.log(
      `[sync-order-leads] ${existingPhoneSet.size} already exist (${unassignedExisting.length} unassigned), ${newClients.length} are new`
    );

    // Step 6: Get agents for round-robin assignment (fixed order by name for consistency)
    const agents = await prisma.user.findMany({
      where: {
        isActive: true,
        Role: { name: { in: ['Sales Agent'] } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Determine round-robin starting index from the last assigned is_existing lead
    // (isolated from Meta/manual leads so order-sync rotation is independent)
    let startIndex = 0;
    if (agents.length > 0) {
      const lastLead = await prisma.lead.findFirst({
        where: {
          assignedToId: { not: null },
          is_existing: true,
        },
        orderBy: { createdAt: 'desc' },
        select: { assignedToId: true },
      });
      if (lastLead?.assignedToId) {
        const idx = agents.findIndex((a) => a.id === lastLead.assignedToId);
        startIndex = idx === -1 ? 0 : (idx + 1) % agents.length;
      }
    }

    const now = new Date();

    // Step 6b: Heal unassigned existing leads via round-robin
    let healedCount = 0;
    if (unassignedExisting.length > 0 && agents.length > 0) {
      const healUpdates = unassignedExisting.map((lead, i) =>
        prisma.lead.update({
          where: { id: lead.id },
          data: {
            assignedToId: agents[(startIndex + i) % agents.length].id,
            updatedAt: now,
          },
        })
      );
      // Run in batches of 50
      for (let i = 0; i < healUpdates.length; i += 50) {
        await Promise.all(healUpdates.slice(i, i + 50));
      }
      healedCount = unassignedExisting.length;
      // Advance startIndex for new leads creation below
      startIndex = (startIndex + healedCount) % (agents.length || 1);
      console.log(`[sync-order-leads] Healed ${healedCount} unassigned leads`);
    }

    if (!newClients.length) {
      return NextResponse.json({
        success: true,
        checked: validClients.length,
        alreadyExist: existingPhoneSet.size,
        newLeadsCreated: 0,
        healed: healedCount,
        message: healedCount > 0
          ? `No new leads, but reassigned ${healedCount} previously unassigned leads`
          : 'All clients already exist as leads',
      });
    }

    // Step 7: Build and create new leads in bulk
    const leadsToCreate = newClients.map((client, i) => ({
      id: randomUUID(),
      name: client.name,
      phone: client.phone,
      email: null,
      alternatePhone: null,
      source: client.source,
      status: 'new',
      priority: 'medium',
      is_existing: true,
      lead_category: 'OUTBOUND',
      city: client.city || null,
      state: client.state || null,
      address: client.address || null,
      pincode: client.pincode || null,
      notes: client.orderDate
        ? `Re-engagement: last order on ${client.orderDate}`
        : 'Re-engagement: imported from order history',
      assignedToId:
        agents.length > 0 ? agents[(startIndex + i) % agents.length].id : null,
      createdAt: now,
      updatedAt: now,
    }));

    const result = await prisma.lead.createMany({
      data: leadsToCreate,
      skipDuplicates: true,
    });

    console.log(`[sync-order-leads] Created ${result.count} new leads`);

    return NextResponse.json({
      success: true,
      checked: validClients.length,
      alreadyExist: existingPhoneSet.size,
      newLeadsCreated: result.count,
      healed: healedCount,
      message: `Successfully synced ${result.count} new leads and reassigned ${healedCount} previously unassigned leads`,
    });
  } catch (error) {
    console.error('[sync-order-leads] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}
