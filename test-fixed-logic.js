// Test the fixed logic with mock data
const now = new Date('2025-12-04T09:15:00.000Z');

const mockFollowUps = [
  { leadId: '1', lead: { name: 'சக சக்கரைபான்டி' }, scheduledAt: '2025-12-02T15:34:34.000Z' },
  { leadId: '2', lead: { name: 'ram khan' }, scheduledAt: '2025-12-02T18:09:00.000Z' },
  { leadId: '2', lead: { name: 'ram khan' }, scheduledAt: '2025-12-03T15:55:07.000Z' },
  { leadId: '2', lead: { name: 'ram khan' }, scheduledAt: '2025-12-04T13:12:18.000Z' },
  { leadId: '2', lead: { name: 'ram khan' }, scheduledAt: '2025-12-04T13:18:10.000Z' },
  { leadId: '2', lead: { name: 'ram khan' }, scheduledAt: '2025-12-04T14:11:33.000Z' }, // PAST
  { leadId: '3', lead: { name: 'ADIYA' }, scheduledAt: '2025-12-02T20:19:52.000Z' },
  { leadId: '3', lead: { name: 'ADIYA' }, scheduledAt: '2025-12-03T16:09:50.000Z' },
  { leadId: '3', lead: { name: 'ADIYA' }, scheduledAt: '2025-12-04T15:14:00.000Z' }, // FUTURE ✅
  { leadId: '4', lead: { name: 'lodha' }, scheduledAt: '2025-12-03T11:50:31.000Z' },
  { leadId: '5', lead: { name: 'Query' }, scheduledAt: '2025-12-03T12:25:12.000Z' },
  { leadId: '6', lead: { name: 'ramesh test' }, scheduledAt: '2025-12-03T13:44:06.000Z' },
  { leadId: '6', lead: { name: 'ramesh test' }, scheduledAt: '2025-12-03T16:10:45.000Z' },
  { leadId: '6', lead: { name: 'ramesh test' }, scheduledAt: '2025-12-04T12:58:00.000Z' },
  { leadId: '6', lead: { name: 'ramesh test' }, scheduledAt: '2025-12-04T14:55:00.000Z' }, // FUTURE ✅
  { leadId: '7', lead: { name: 'Rajendran' }, scheduledAt: '2025-12-03T15:28:00.000Z' },
  { leadId: '7', lead: { name: 'Rajendran' }, scheduledAt: '2025-12-09T15:29:00.000Z' }, // FUTURE ✅
  { leadId: '8', lead: { name: 'kiruba broooooooo' }, scheduledAt: '2025-12-03T17:56:39.000Z' },
  { leadId: '9', lead: { name: 'Dhilip Prabakaran' }, scheduledAt: '2025-12-04T11:35:00.000Z' },
  { leadId: '1', lead: { name: 'சக சக்கரைபான்டி' }, scheduledAt: '2025-12-03T16:03:13.000Z' },
];

console.log('🔍 Testing FIXED Dashboard Logic\n');
console.log('Current Time:', now.toISOString());
console.log('=' .repeat(80));

// FIXED Logic: Find NEXT follow-up per lead (prefer future over past)
const leadNextFollowUpForDisplay = new Map();

// Group all follow-ups by leadId
const followUpsByLeadForDisplay = new Map();
for (const followUp of mockFollowUps) {
  if (!followUpsByLeadForDisplay.has(followUp.leadId)) {
    followUpsByLeadForDisplay.set(followUp.leadId, []);
  }
  followUpsByLeadForDisplay.get(followUp.leadId).push(followUp);
}

console.log(`\nLeads with follow-ups: ${followUpsByLeadForDisplay.size}\n`);
console.log('NEXT follow-up per lead:\n');

// Find the NEXT follow-up per lead (prefer earliest future, else most recent past)
for (const [leadId, followUps] of followUpsByLeadForDisplay.entries()) {
  const futureFollowUps = followUps.filter(f => new Date(f.scheduledAt) >= now);
  const pastFollowUps = followUps.filter(f => new Date(f.scheduledAt) < now);
  
  let nextFollowUp;
  
  if (futureFollowUps.length > 0) {
    // Prefer earliest future follow-up
    nextFollowUp = futureFollowUps.reduce((earliest, current) => {
      return new Date(current.scheduledAt) < new Date(earliest.scheduledAt) ? current : earliest;
    });
  } else if (pastFollowUps.length > 0) {
    // If no future, use most recent past
    nextFollowUp = pastFollowUps.reduce((latest, current) => {
      return new Date(current.scheduledAt) > new Date(latest.scheduledAt) ? current : latest;
    });
  }
  
  if (nextFollowUp) {
    leadNextFollowUpForDisplay.set(leadId, nextFollowUp);
    const isFuture = new Date(nextFollowUp.scheduledAt) >= now;
    console.log(`  ${nextFollowUp.lead.name}: ${new Date(nextFollowUp.scheduledAt).toLocaleString()} - ${isFuture ? 'FUTURE ✅' : 'PAST ❌'}`);
  }
}

// Filter only FUTURE follow-ups for display
const upcomingArray = [];
for (const followUp of leadNextFollowUpForDisplay.values()) {
  const scheduledDate = new Date(followUp.scheduledAt);
  if (scheduledDate >= now) {
    upcomingArray.push(followUp);
  }
}

// Sort by scheduled date and take top 5
upcomingArray.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
const displayFollowUps = upcomingArray.slice(0, 5);

console.log('\n' + '=' .repeat(80));
console.log(`\n📊 RESULTS:`);
console.log(`   Total NEXT follow-ups: ${leadNextFollowUpForDisplay.size}`);
console.log(`   Upcoming (Future): ${upcomingArray.length}`);
console.log(`   Display Follow-ups: ${displayFollowUps.length}`);
console.log('\n' + '=' .repeat(80));

if (displayFollowUps.length > 0) {
  console.log('\n✅ UPCOMING FOLLOW-UPS TO DISPLAY:\n');
  displayFollowUps.forEach((followUp, index) => {
    console.log(`${index + 1}. ${followUp.lead.name}`);
    console.log(`   Scheduled: ${new Date(followUp.scheduledAt).toLocaleString()}`);
    console.log('');
  });
} else {
  console.log('\n❌ NO UPCOMING FOLLOW-UPS!');
}
