/**
 * One-off: rewrite CallLog.recordingUrl values that still point at
 * *.supabase.co/storage/... → https://wellnessvalley.in/costmanager/proposal-images/...
 *
 * Safe: only updates URL strings; does not migrate/push schema.
 */
import { PrismaClient } from '@prisma/client';
import { resolveMediaUrl } from '../src/shared/lib/storage/media-url';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.callLog.findMany({
    where: {
      OR: [
        { recordingUrl: { contains: 'supabase.co' } },
        { recordingUrl: { contains: 'storage/v1/object' } },
      ],
    },
    select: { id: true, recordingUrl: true },
  });

  console.log(`Found ${rows.length} call log(s) with legacy storage URLs`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const next = resolveMediaUrl(row.recordingUrl);
    if (!next || next === row.recordingUrl) {
      skipped += 1;
      console.log(`skip ${row.id}: ${row.recordingUrl}`);
      continue;
    }

    await prisma.callLog.update({
      where: { id: row.id },
      data: { recordingUrl: next },
    });
    updated += 1;
    console.log(`ok  ${row.id}`);
    console.log(`    ${row.recordingUrl}`);
    console.log(` -> ${next}`);
  }

  const remaining = await prisma.callLog.count({
    where: { recordingUrl: { contains: 'supabase.co' } },
  });

  console.log(`\nDone. updated=${updated} skipped=${skipped} remaining_supabase=${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
