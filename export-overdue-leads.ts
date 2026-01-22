import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OverdueLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
  assignedTo?: string;
  priority?: string;
  scheduledFollowUpDate?: string;
}

async function exportOverdueLeads() {
  try {
    console.log('🔍 Fetching overdue follow-ups...');

    const now = new Date();

    // Get all pending follow-ups that are overdue (scheduled date < now)
    // CRITICAL: Only for ACTIVE leads (status: new, followup, qualified) - matches UI logic
    const pendingOverdueFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'pending',
        scheduledAt: {
          lt: now,
        },
        Lead: {
          status: {
            in: ['new', 'followup', 'qualified'],
          },
        },
      },
      include: {
        Lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            alternatePhone: true,
            priority: true,
            assignedToId: true,
            status: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Get unique leads
    const uniqueLeadMap = new Map<string, OverdueLead>();

    for (const followUp of pendingOverdueFollowUps) {
      if (!uniqueLeadMap.has(followUp.Lead.id)) {
        uniqueLeadMap.set(followUp.Lead.id, {
          id: followUp.Lead.id,
          name: followUp.Lead.name,
          phone: followUp.Lead.phone,
          email: followUp.Lead.email || '',
          alternatePhone: followUp.Lead.alternatePhone || '',
          priority: followUp.Lead.priority || 'medium',
          scheduledFollowUpDate: followUp.scheduledAt.toISOString(),
        });
      }
    }

    const overdueLeads = Array.from(uniqueLeadMap.values());

    console.log(`✅ Found ${overdueLeads.length} leads with overdue follow-ups`);

    if (overdueLeads.length === 0) {
      console.log('No overdue follow-ups found.');
      await prisma.$disconnect();
      return;
    }

    // Create CSV content
    const csvHeaders = ['ID', 'Name', 'Mobile Number', 'Email', 'Alternate Phone', 'Priority', 'Scheduled Follow-up Date', 'Days Overdue'];
    
    const csvRows = overdueLeads.map(lead => {
      const scheduledDate = new Date(lead.scheduledFollowUpDate || new Date());
      const daysOverdue = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return [
        `"${lead.id}"`,
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.phone}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.alternatePhone || '').replace(/"/g, '""')}"`,
        `"${lead.priority}"`,
        `"${lead.scheduledFollowUpDate}"`,
        daysOverdue,
      ].join(',');
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows,
    ].join('\n');

    // Save to file with timestamp
    const timestamp = new Date().getTime();
    const fileName = `overdue-leads-active-${timestamp}.csv`;
    const filePath = path.join(process.cwd(), fileName);

    fs.writeFileSync(filePath, csvContent, 'utf-8');

    console.log(`📁 CSV file created: ${filePath}`);
    console.log(`📊 Total overdue leads: ${overdueLeads.length}`);
    console.log('\n Sample data:');
    overdueLeads.slice(0, 5).forEach(lead => {
      console.log(`  - ${lead.id}: ${lead.name} (${lead.phone})`);
    });

    // Also create XLSX using xlsx library
    try {
      const XLSX = require('xlsx');
      
      // Prepare data for Excel
      const excelData = overdueLeads.map(lead => {
        const scheduledDate = new Date(lead.scheduledFollowUpDate || new Date());
        const daysOverdue = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          'ID': lead.id,
          'Name': lead.name,
          'Mobile Number': lead.phone,
          'Email': lead.email || '',
          'Alternate Phone': lead.alternatePhone || '',
          'Priority': lead.priority,
          'Scheduled Date': new Date(lead.scheduledFollowUpDate || new Date()).toLocaleString(),
          'Days Overdue': daysOverdue,
        };
      });

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 },  // ID
        { wch: 20 },  // Name
        { wch: 15 },  // Mobile Number
        { wch: 25 },  // Email
        { wch: 15 },  // Alternate Phone
        { wch: 12 },  // Priority
        { wch: 25 },  // Scheduled Date
        { wch: 12 },  // Days Overdue
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Overdue Leads');

      const excelFileName = `overdue-leads-active-${timestamp}.xlsx`;
      const excelFilePath = path.join(process.cwd(), excelFileName);

      XLSX.writeFile(workbook, excelFilePath);
      console.log(`\n✨ Excel file created: ${excelFilePath}`);
    } catch (error) {
      console.log('\n⚠️  Error creating Excel file:', error);
      console.log('CSV file is available as backup.');
    }

  } catch (error) {
    console.error('❌ Error exporting overdue leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportOverdueLeads();
