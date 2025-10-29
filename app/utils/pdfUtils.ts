import { ScheduledRoutine } from '../types/schedule';
import { formatTime, getDayName } from './timeUtils';

export const generateSchedulePDF = (scheduledRoutines: ScheduledRoutine[], weekDates: Date[]) => {
  // Create a simple HTML document for PDF generation
  const htmlContent = generateScheduleHTML(scheduledRoutines, weekDates);
  
  // Open in new window for printing/saving as PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};

const generateScheduleHTML = (scheduledRoutines: ScheduledRoutine[], weekDates: Date[]) => {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  const weekRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  // Group routines by day
  const routinesByDay = weekDates.map((date) => {
    const dayRoutines = scheduledRoutines.filter(routine => routine.startTime.day === date.getDay());
    return {
      date,
      dayName: getDayName(date.getDay()),
      dayNumber: date.getDate(),
      routines: dayRoutines.sort((a, b) => a.startTime.hour - b.startTime.hour)
    };
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dance Studio Schedule - ${weekRange}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #3B82F6;
          padding-bottom: 20px;
        }
        .header h1 {
          color: #1E40AF;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: #6B7280;
          margin: 5px 0 0 0;
          font-size: 16px;
        }
        .week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .day-column {
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          background: #F9FAFB;
        }
        .day-header {
          background: #3B82F6;
          color: white;
          padding: 12px;
          text-align: center;
          border-radius: 6px 6px 0 0;
          font-weight: bold;
          font-size: 14px;
        }
        .day-content {
          padding: 10px;
          min-height: 200px;
        }
        .routine-item {
          background: white;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          padding: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .routine-time {
          font-weight: bold;
          color: #1F2937;
          margin-bottom: 4px;
        }
        .routine-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 2px;
        }
        .routine-details {
          color: #6B7280;
          font-size: 11px;
        }
        .routine-teacher {
          margin-bottom: 2px;
        }
        .routine-dancers {
          margin-bottom: 2px;
        }
        .routine-room {
          font-weight: 500;
        }
        .conflict-warning {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          padding: 6px;
          border-radius: 4px;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .summary {
          background: #F3F4F6;
          padding: 20px;
          border-radius: 8px;
          margin-top: 30px;
        }
        .summary h3 {
          color: #1F2937;
          margin: 0 0 15px 0;
          font-size: 18px;
        }
        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        .stat-item {
          background: white;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #3B82F6;
        }
        .stat-label {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: #1F2937;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
          color: #6B7280;
          font-size: 12px;
        }
        @media print {
          body { margin: 0; padding: 15px; }
          .week-grid { page-break-inside: avoid; }
          .day-column { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dance Studio Schedule</h1>
        <p>Week of ${weekRange}</p>
      </div>

      <div class="week-grid">
        ${routinesByDay.map(day => `
          <div class="day-column">
            <div class="day-header">
              ${day.dayName}<br>
              <span style="font-size: 12px;">${day.dayNumber}</span>
            </div>
            <div class="day-content">
              ${day.routines.length === 0 ? 
                '<div style="text-align: center; color: #9CA3AF; font-size: 12px; padding: 20px;">No classes scheduled</div>' :
                day.routines.map(routine => `
                  <div class="routine-item" style="border-left: 4px solid ${routine.routine.color};">
                    <div class="routine-time">${formatTime(routine.startTime.hour, routine.startTime.minute)} - ${formatTime(routine.endTime.hour, routine.endTime.minute)}</div>
                    <div class="routine-title">${routine.routine.songTitle}</div>
                    <div class="routine-details">
                      <div class="routine-teacher">Teacher: ${routine.routine.teacher.name}</div>
                      <div class="routine-dancers">Dancers: ${routine.routine.dancers.map(d => d.name).join(', ')}</div>
                      <div class="routine-room">Room: ${routine.roomId}</div>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        `).join('')}
      </div>

      <div class="summary">
        <h3>Schedule Summary</h3>
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-label">Total Classes</div>
            <div class="stat-value">${scheduledRoutines.length}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Hours</div>
            <div class="stat-value">${(scheduledRoutines.reduce((sum, r) => sum + r.duration, 0) / 60).toFixed(1)}h</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Unique Dancers</div>
            <div class="stat-value">${new Set(scheduledRoutines.flatMap(r => r.routine.dancers.map(d => d.id))).size}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Active Rooms</div>
            <div class="stat-value">${new Set(scheduledRoutines.map(r => r.roomId)).size}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })} at ${new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}</p>
      </div>
    </body>
    </html>
  `;
};
