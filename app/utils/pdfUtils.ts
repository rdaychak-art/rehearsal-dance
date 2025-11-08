import { ScheduledRoutine } from '../types/schedule';
import { Room } from '../types/room';
import { formatTime } from './timeUtils';

export const generateSchedulePDF = (scheduledRoutines: ScheduledRoutine[], rangeDates: Date[], rooms?: Room[]) => {
  // Create a simple HTML document for PDF generation
  const htmlContent = generateScheduleHTML(scheduledRoutines, rangeDates, rooms);
  
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

const generateScheduleHTML = (scheduledRoutines: ScheduledRoutine[], rangeDates: Date[], rooms?: Room[]) => {
  // If rooms are provided, use calendar grid layout (one page per day with schedules)
  if (rooms) {
    return generateMultiDayCalendarGridHTML(scheduledRoutines, rangeDates, rooms);
  }

  // Fallback to table layout if no rooms provided
  const rangeStart = rangeDates[0];
  const rangeEnd = rangeDates[rangeDates.length - 1];
  const rangeLabel = rangeDates.length === 1
    ? rangeStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' }).toUpperCase()
    : `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${rangeEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Parse YYYY-MM-DD into a local Date (avoids UTC shift)
  const parseLocalDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  
  // Build a flat, sorted list (by date then time)
  const sorted = [...scheduledRoutines].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aMin = a.startTime.hour * 60 + a.startTime.minute;
    const bMin = b.startTime.hour * 60 + b.startTime.minute;
    return aMin - bMin;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dance Studio Schedule - ${rangeLabel}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: white; color: #333; }
        .header { text-align: center; margin-bottom: 16px; }
        .header h1 { color: #111827; margin: 0; font-size: 20px; }
        .header p { color: #6B7280; margin: 6px 0 0 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #E5E7EB; padding: 8px 10px; font-size: 12px; }
        th { background: #F3F4F6; text-align: left; color: #374151; }
        tbody tr:nth-child(even) { background: #FAFAFA; }
        .muted { color: #6B7280; }
        @media print { body { margin: 0; padding: 12px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Dance Studio Schedule</h1>
        <p>${rangeLabel}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 120px;">Date</th>
            <th style="width: 90px;">Start</th>
            <th style="width: 90px;">End</th>
            <th style="width: 120px;">Room</th>
            <th>Routine</th>
            <th style="width: 160px;">Teacher</th>
            <th>Dancers</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(r => `
            <tr>
              <td>${parseLocalDate(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</td>
              <td>${formatTime(r.startTime.hour, r.startTime.minute)}</td>
              <td>${formatTime(r.endTime.hour, r.endTime.minute)}</td>
              <td>${r.roomId}</td>
              <td>${r.routine.songTitle}</td>
              <td>${r.routine.teacher.name}</td>
              <td class="muted">${r.routine.dancers.map(d => d.name).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      
    </body>
    </html>
  `;
};

const generateMultiDayCalendarGridHTML = (scheduledRoutines: ScheduledRoutine[], rangeDates: Date[], rooms: Room[]) => {
  // Group routines by date
  const routinesByDate = new Map<string, ScheduledRoutine[]>();
  scheduledRoutines.forEach(routine => {
    if (!routinesByDate.has(routine.date)) {
      routinesByDate.set(routine.date, []);
    }
    routinesByDate.get(routine.date)!.push(routine);
  });

  // Get unique dates that have schedules, sorted
  const datesWithSchedules = Array.from(routinesByDate.keys())
    .sort()
    .map(dateStr => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    });

  // Generate one page per day (only for days with schedules)
  const dayPages = datesWithSchedules.map(date => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayRoutines = routinesByDate.get(dateStr) || [];
    return generateCalendarGridBody(dayRoutines, date, rooms);
  });

  // Combine all day pages with page breaks
  const dateLabel = datesWithSchedules.length === 1
    ? datesWithSchedules[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' }).toUpperCase()
    : `${datesWithSchedules[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${datesWithSchedules[datesWithSchedules.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dance Studio Schedule - ${dateLabel}</title>
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
          margin-bottom: 20px; 
        }
        .header h1 { 
          color: #111827; 
          margin: 0; 
          font-size: 24px; 
          font-weight: 600;
          letter-spacing: 1px;
        }
        .schedule-grid { 
          width: 100%; 
          margin-top: 20px;
          display: grid;
          grid-template-columns: 80px repeat(var(--room-count, 4), 1fr);
          border: 1px solid #D1D5DB;
        }
        .grid-header {
          display: contents;
        }
        .grid-header > div {
          background: #F3F4F6;
          border: 1px solid #D1D5DB;
          padding: 12px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 13px;
          color: #374151;
        }
        .time-column { 
          background: #F9FAFB; 
          text-align: center; 
          font-weight: 500;
          font-size: 11px;
          border: 1px solid #D1D5DB;
          padding: 8px;
        }
        .room-header { 
          background: #F3F4F6; 
          text-align: center; 
          font-weight: 600;
          font-size: 13px;
          padding: 12px 8px;
          border: 1px solid #D1D5DB;
        }
        .grid-row {
          display: contents;
        }
        .room-cell {
          border: 1px solid #D1D5DB;
          padding: 4px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          min-height: 12px;
          position: relative;
        }
        .room-cell.occupied {
          padding: 0;
        }
        .routine-block { 
          padding: 4px 6px;
          margin: 1px 0;
          border-radius: 4px;
          background: #EFF6FF;
          border-left: 3px solid #3B82F6;
          width: 100%;
          box-sizing: border-box;
          min-height: fit-content;
          height: 100%;
        }
        .routine-title { 
          font-weight: 600; 
          font-size: 11px; 
          color: #1E40AF;
          margin-bottom: 4px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .routine-time { 
          font-size: 10px; 
          color: #475569;
          margin-bottom: 4px;
        }
        .routine-teacher { 
          font-size: 10px; 
          color: #64748B;
          margin-bottom: 4px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .routine-dancers { 
          font-size: 8px; 
          color: #64748B; 
          line-height: 1.3;
          margin-top: 4px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .empty-cell { 
          background: #FAFAFA; 
          min-height: 12px;
        }
        .day-page {
          margin-bottom: 40px;
        }
        @media print { 
          body { margin: 0; padding: 12px; }
          .schedule-grid { page-break-inside: avoid; }
          .day-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .day-page:last-child {
            page-break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      ${dayPages.map((bodyContent) => `
        <div class="day-page">
          ${bodyContent}
        </div>
      `).join('')}
    </body>
    </html>
  `;
};

const generateCalendarGridBody = (scheduledRoutines: ScheduledRoutine[], date: Date, rooms: Room[]): string => {
  // Show all active rooms, not just rooms with schedules
  // This ensures all studios are visible even if they have no schedules for the day
  const activeRooms = rooms
    .filter(r => r.isActive)
    .sort((a, b) => a.id.localeCompare(b.id));

  // Find time range for the day
  let minHour = 24;
  let maxHour = 0;
  scheduledRoutines.forEach(sr => {
    const startMin = sr.startTime.hour * 60 + sr.startTime.minute;
    const endMin = sr.endTime.hour * 60 + sr.endTime.minute;
    minHour = Math.min(minHour, Math.floor(startMin / 60));
    maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
  });

  // Default to 9 AM - 9 PM if no routines
  if (minHour === 24) minHour = 9;
  if (maxHour === 0) maxHour = 21;

  // Generate time slots (15-minute intervals for more precision)
  const timeSlots: Array<{ hour: number; minute: number }> = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    const minutes = [0, 15, 30, 45];
    for (const minute of minutes) {
      timeSlots.push({ hour, minute });
    }
  }

  // Helper to calculate row span for a routine
  const getRowSpan = (routine: ScheduledRoutine): number => {
    const duration = routine.duration;
    // Each row is 15 minutes, so calculate how many rows this routine spans
    return Math.max(1, Math.ceil(duration / 15));
  };

  const dateLabel = date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric', 
    weekday: 'long' 
  }).toUpperCase();

  const roomCount = activeRooms.length;

  // Build a map of which routine should be rendered in which cell
  // Map: `${rowIndex}-${roomIndex}` -> routine or null
  const cellMap = new Map<string, { routine: ScheduledRoutine; rowSpan: number } | null>();
  
  // First, find all routines and determine which time slot row they should start in
  scheduledRoutines.forEach(routine => {
    const routineStart = routine.startTime.hour * 60 + routine.startTime.minute;
    
    // Find the first time slot that contains or starts before the routine start time
    let startRowIndex = -1;
    for (let i = 0; i < timeSlots.length; i++) {
      const slotStart = timeSlots[i].hour * 60 + timeSlots[i].minute;
      const slotEnd = slotStart + 15; // 15-minute intervals
      
      // Routine should start rendering at the first slot where: slotStart <= routineStart < slotEnd
      if (slotStart <= routineStart && routineStart < slotEnd) {
        startRowIndex = i;
        break;
      }
    }
    
    // If we found a starting row, find the room index
    if (startRowIndex >= 0) {
      const roomIndex = activeRooms.findIndex(r => r.id === routine.roomId);
      if (roomIndex >= 0) {
        const cellKey = `${startRowIndex}-${roomIndex}`;
        const rowSpan = getRowSpan(routine);
        cellMap.set(cellKey, { routine, rowSpan });
        
        // Mark subsequent rows as occupied by this routine
        for (let i = 1; i < rowSpan; i++) {
          const nextRowKey = `${startRowIndex + i}-${roomIndex}`;
          if (!cellMap.has(nextRowKey)) {
            cellMap.set(nextRowKey, null); // null means occupied but not rendered here
          }
        }
      }
    }
  });
  
  // Now mark all other cells as empty or occupied
  timeSlots.forEach((_, rowIndex) => {
    activeRooms.forEach((room, roomIndex) => {
      const cellKey = `${rowIndex}-${roomIndex}`;
      
      // Skip if already set
      if (cellMap.has(cellKey)) return;
      
      // Check if this cell is occupied by a routine from an earlier row
      let isOccupied = false;
      for (let prevRow = rowIndex - 1; prevRow >= 0; prevRow--) {
        const prevKey = `${prevRow}-${roomIndex}`;
        const prevData = cellMap.get(prevKey);
        if (prevData && prevData.routine) {
          const rowSpan = prevData.rowSpan;
          if (rowIndex < prevRow + rowSpan) {
            isOccupied = true;
            break;
          }
        }
      }
      
      if (isOccupied) {
        cellMap.set(cellKey, null);
      } else {
        cellMap.set(cellKey, null); // Empty cell
      }
    });
  });

  return `
      <div class="header">
        <h1>${dateLabel}</h1>
      </div>

      <div class="schedule-grid" style="--room-count: ${roomCount};">
        <!-- Header Row -->
        <div class="grid-header">
          <div class="time-column">TIME</div>
          ${activeRooms.map(room => `
            <div class="room-header">${room.name.toUpperCase()}</div>
          `).join('')}
        </div>
        
        <!-- Time Slot Rows -->
        ${timeSlots.map(({ hour, minute }, rowIndex) => {
          const timeLabel = formatTime(hour, minute);
          
          // Check if this row has any routines (either starting here or continuing from earlier)
          const hasAnyRoutine = activeRooms.some((room, roomIndex) => {
            const cellKey = `${rowIndex}-${roomIndex}`;
            const cellData = cellMap.get(cellKey);
            
            // Check if there's a routine starting here
            if (cellData && cellData.routine) {
              return true;
            }
            
            // Check if this cell is occupied by a routine from an earlier row
            for (let prevRow = rowIndex - 1; prevRow >= 0; prevRow--) {
              const prevKey = `${prevRow}-${roomIndex}`;
              const prevData = cellMap.get(prevKey);
              if (prevData && prevData.routine) {
                const rowSpan = prevData.rowSpan;
                if (rowIndex < prevRow + rowSpan) {
                  return true;
                }
              }
            }
            
            return false;
          });
          
          // Skip rows with no routines
          if (!hasAnyRoutine) {
            return '';
          }
          
          return `
            <div class="grid-row">
              <div class="time-column">${timeLabel}</div>
              ${activeRooms.map((room, roomIndex) => {
                const cellKey = `${rowIndex}-${roomIndex}`;
                const cellData = cellMap.get(cellKey);
                
                if (cellData && cellData.routine) {
                  // Render routine
                  const { routine, rowSpan } = cellData;
                  const dancerNames = routine.routine.dancers.map(d => d.name).join(', ');
                  return `
                    <div class="room-cell occupied" style="grid-row: span ${rowSpan};">
                      <div class="routine-block">
                        <div class="routine-title">${routine.routine.songTitle}</div>
                        <div class="routine-time">${formatTime(routine.startTime.hour, routine.startTime.minute)} - ${formatTime(routine.endTime.hour, routine.endTime.minute)}</div>
                        <div class="routine-teacher">${routine.routine.teacher.name}</div>
                        ${dancerNames ? `<div class="routine-dancers">${dancerNames}</div>` : ''}
                      </div>
                    </div>
                  `;
                } else {
                  // Check if this cell is occupied by a routine from an earlier row
                  let isOccupied = false;
                  for (let prevRow = rowIndex - 1; prevRow >= 0; prevRow--) {
                    const prevKey = `${prevRow}-${roomIndex}`;
                    const prevData = cellMap.get(prevKey);
                    if (prevData && prevData.routine) {
                      const rowSpan = prevData.rowSpan;
                      if (rowIndex < prevRow + rowSpan) {
                        isOccupied = true;
                        break;
                      }
                    }
                  }
                  
                  if (isOccupied) {
                    // This cell is occupied by a routine from an earlier row
                    // Render an empty placeholder div to maintain grid structure
                    return `<div class="room-cell" style="display: none;"></div>`;
                  } else {
                    // Empty cell
                    return `<div class="room-cell empty-cell"></div>`;
                  }
                }
              }).join('')}
            </div>
          `;
        }).filter(row => row !== '').join('')}
      </div>
  `;
};
