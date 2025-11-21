/**
 * Excel and PDF Export Utilities for DSR
 * Uses pure JavaScript - no external dependencies needed
 */

interface DSRExportData {
  performance: any;
  statusBreakdown: any;
  avgCalls: any;
  mostContacted: any;
  agentPerformance?: any;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  userName: string;
}

/**
 * Export DSR data to Excel (CSV format)
 */
export function exportToExcel(data: DSRExportData): void {
  try {
    const { performance, statusBreakdown, avgCalls, mostContacted, agentPerformance, dateRange, userName } = data;
    
    let csvContent = '';
    
    // Header
    csvContent += `Daily Sales Report (DSR)\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n`;
    csvContent += `Period: ${dateRange.startDate} to ${dateRange.endDate}\n`;
    csvContent += `Agent: ${userName}\n\n`;
    
    // My Performance Section
    csvContent += `MY PERFORMANCE\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Calls,${performance?.totalCalls || 0}\n`;
    csvContent += `Answered Calls,${performance?.answeredCalls || 0}\n`;
    csvContent += `Not Answered,${performance?.notAnsweredCalls || 0}\n`;
    csvContent += `Total Talk Time (seconds),${performance?.totalTalkTime || 0}\n`;
    csvContent += `Average Call Duration (seconds),${performance?.avgCallDuration || 0}\n`;
    csvContent += `Unique Leads Contacted,${performance?.uniqueLeadsContacted || 0}\n`;
    csvContent += `New Leads Handled,${performance?.newLeadsHandled || 0}\n`;
    csvContent += `Follow-ups Scheduled,${performance?.followUpsScheduled || 0}\n`;
    csvContent += `Follow-ups Completed,${performance?.followUpsCompleted || 0}\n`;
    csvContent += `Unreachable Count,${performance?.unreachableCount || 0}\n`;
    csvContent += `Unqualified Count,${performance?.unqualifiedCount || 0}\n`;
    csvContent += `Follow-up Calls,${performance?.followUpCalls || 0}\n\n`;
  
  // Status Breakdown Section
  if (statusBreakdown?.breakdown?.length > 0) {
    csvContent += `STATUS BREAKDOWN\n`;
    csvContent += `Status,Count,Percentage\n`;
    statusBreakdown.breakdown.forEach((item: any) => {
      csvContent += `${item.status},${item.count},${item.percentage}%\n`;
    });
    csvContent += `\n`;
  }
  
  // Average Calls Section
  if (avgCalls) {
    csvContent += `AVERAGE CALLS PER LEAD\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Leads Worked,${avgCalls.totalLeadsWorked || 0}\n`;
    csvContent += `Total Calls,${avgCalls.totalCalls || 0}\n`;
    csvContent += `Average Calls Per Lead,${avgCalls.avgCallsPerLead || 0}\n\n`;
    
    if (avgCalls.trend?.length > 0) {
      csvContent += `7-Day Trend\n`;
      csvContent += `Date,Avg Calls,Total Calls,Total Leads\n`;
      avgCalls.trend.forEach((day: any) => {
        csvContent += `${day.date},${day.avgCallsPerLead},${day.totalCalls},${day.totalLeads}\n`;
      });
      csvContent += `\n`;
    }
  }
  
  // Most Contacted Lead
  if (mostContacted?.lead) {
    csvContent += `MOST CONTACTED LEAD\n`;
    csvContent += `Name,${mostContacted.lead.name}\n`;
    csvContent += `Phone,${mostContacted.lead.phone}\n`;
    csvContent += `Status,${mostContacted.lead.status}\n`;
    csvContent += `Attempt Count,${mostContacted.attemptCount}\n`;
    csvContent += `Last Call Status,${mostContacted.lastCallStatus || 'N/A'}\n\n`;
  }
  
  // Agent Performance (SuperAgent only)
  if (agentPerformance?.length > 0) {
    csvContent += `TEAM PERFORMANCE\n`;
    csvContent += `Agent Name,Email,Total Calls,Answered,Not Answered,Follow-ups,Talk Time (sec),Avg Duration (sec)\n`;
    agentPerformance.forEach((agent: any) => {
      csvContent += `${agent.agentName},${agent.agentEmail},${agent.totalCalls},${agent.answeredCalls},${agent.notAnsweredCalls},${agent.followUps},${agent.totalTalkTime},${agent.avgDuration}\n`;
    });
  }
  
  // Create download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `DSR_${dateRange.startDate}_to_${dateRange.endDate}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to generate Excel file. Please check your data and try again.');
  }
}

/**
 * Export DSR data to PDF (HTML to Print)
 */
export function exportToPDF(data: DSRExportData): void {
  try {
    const { performance, statusBreakdown, avgCalls, mostContacted, agentPerformance, dateRange, userName } = data;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Please allow popups to export PDF');
    }
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Daily Sales Report - ${dateRange.startDate}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
          line-height: 1.6;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #9c5342;
          padding-bottom: 20px;
        }
        
        .header h1 {
          color: #9c5342;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .header p {
          color: #666;
          font-size: 14px;
        }
        
        .section {
          margin-bottom: 30px;
          page-break-inside: avoid;
        }
        
        .section-title {
          background: #9c5342;
          color: white;
          padding: 10px 15px;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
          background: #f9f9f9;
        }
        
        .stat-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #9c5342;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          color: #333;
        }
        
        tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .badge-green {
          background: #48BB78;
          color: white;
        }
        
        .badge-red {
          background: #E53E3E;
          color: white;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        
        @media print {
          body {
            padding: 20px;
          }
          
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Daily Sales Report (DSR)</h1>
        <p><strong>Agent:</strong> ${userName}</p>
        <p><strong>Period:</strong> ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="section">
        <div class="section-title">📞 My Performance</div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Calls</div>
            <div class="stat-value">${performance?.totalCalls || 0}</div>
            <div style="margin-top: 5px;">
              <span class="badge badge-green">✓ ${performance?.answeredCalls || 0}</span>
              <span class="badge badge-red">✗ ${performance?.notAnsweredCalls || 0}</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Total Talk Time</div>
            <div class="stat-value">${formatDuration(performance?.totalTalkTime || 0)}</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
              Avg: ${formatDuration(performance?.avgCallDuration || 0)}
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Leads Contacted</div>
            <div class="stat-value">${performance?.uniqueLeadsContacted || 0}</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
              ${performance?.newLeadsHandled || 0} new leads
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Follow-ups</div>
            <div class="stat-value">${performance?.followUpsCompleted || 0}/${performance?.followUpsScheduled || 0}</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">
              ${performance?.followUpsScheduled > 0 ? Math.round((performance.followUpsCompleted / performance.followUpsScheduled) * 100) : 0}% completed
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Unreachable</div>
            <div class="stat-value" style="color: #E53E3E;">${performance?.unreachableCount || 0}</div>
          </div>
          
          <div class="stat-card">
            <div class="stat-label">Unqualified</div>
            <div class="stat-value" style="color: #DD6B20;">${performance?.unqualifiedCount || 0}</div>
          </div>
        </div>
      </div>
      
      ${statusBreakdown?.breakdown?.length > 0 ? `
      <div class="section">
        <div class="section-title">📈 Status Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${statusBreakdown.breakdown.map((item: any) => `
              <tr>
                <td style="text-transform: capitalize;">${item.status}</td>
                <td>${item.count}</td>
                <td><strong>${item.percentage}%</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${mostContacted?.lead ? `
      <div class="section">
        <div class="section-title">🎯 Most Contacted Lead</div>
        <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3182CE;">
          <p style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${mostContacted.lead.name}</p>
          <p style="color: #666;">📱 ${mostContacted.lead.phone}</p>
          <p style="color: #666;">Status: <strong>${mostContacted.lead.status}</strong></p>
          <p style="margin-top: 10px;"><span class="badge" style="background: #3182CE; color: white;">${mostContacted.attemptCount} attempts</span></p>
        </div>
      </div>
      ` : ''}
      
      ${agentPerformance?.length > 0 ? `
      <div class="section">
        <div class="section-title">👥 Team Performance</div>
        <table>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Total Calls</th>
              <th>Answered</th>
              <th>Not Answered</th>
              <th>Follow-ups</th>
              <th>Talk Time</th>
            </tr>
          </thead>
          <tbody>
            ${agentPerformance.map((agent: any) => `
              <tr>
                <td>
                  <strong>${agent.agentName}</strong><br>
                  <small style="color: #666;">${agent.agentEmail}</small>
                </td>
                <td><strong>${agent.totalCalls}</strong></td>
                <td><span class="badge badge-green">${agent.answeredCalls}</span></td>
                <td><span class="badge badge-red">${agent.notAnsweredCalls}</span></td>
                <td>${agent.followUps}</td>
                <td>${formatDuration(agent.totalTalkTime)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <div class="footer">
        <p>E2W Lead Management System - Daily Sales Report</p>
        <p>This is a computer-generated report. No signature required.</p>
      </div>
      
      <div class="no-print" style="position: fixed; top: 20px; right: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #9c5342; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
          🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-left: 10px;">
          ✕ Close
        </button>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Auto-print after content loads
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.');
  }
}
