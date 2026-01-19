const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAutoFollowup() {
    try {
        const today = new Date();
        const currentDay = today.getDate();
        
        console.log(`\n🔍 Testing auto-followup for day: ${currentDay}`);
        console.log(`📅 Current date: ${today.toISOString().split('T')[0]}\n`);
        
        // Find won leads that match current day
        const wonLeadsToConvert = await prisma.$queryRaw`
            SELECT id, name, "updatedAt", "assignedToId", status
            FROM "Lead"
            WHERE status = 'won'
            AND EXTRACT(DAY FROM "updatedAt") = ${currentDay}
            LIMIT 10
        `;
        
        console.log(`✅ Found ${wonLeadsToConvert.length} won leads that would be converted`);
        
        if (wonLeadsToConvert.length > 0) {
            console.log('\n📋 Sample leads that will be auto-converted:');
            wonLeadsToConvert.forEach((lead, i) => {
                const wonDate = new Date(lead.updatedAt);
                console.log(`  ${i + 1}. ${lead.name}`);
                console.log(`     - Won on: ${wonDate.toISOString().split('T')[0]} (Day ${wonDate.getDate()})`);
                console.log(`     - Lead ID: ${lead.id}`);
            });
            
            console.log('\n💡 To run the actual conversion, call the cron API:');
            console.log('   GET /api/cron/auto-followup-won-leads');
            console.log('   Header: Authorization: Bearer E2W_LMP_META_WEBHOOK_2026');
        } else {
            console.log(`\n💡 No won leads found for day ${currentDay}`);
            console.log('   This is normal if no leads were won on this day of any month');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testAutoFollowup();
