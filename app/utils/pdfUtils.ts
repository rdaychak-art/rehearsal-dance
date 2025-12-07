import { ScheduledRoutine } from '../types/schedule';
import { Room } from '../types/room';
import { formatTime } from './timeUtils';

const DEFAULT_HEX_COLOR = '#3B82F6';

const normalizeHexColor = (color?: string): string | null => {
  if (!color) return null;
  const trimmed = color.trim();
  if (!/^#?[0-9A-Fa-f]{3}$|^#?[0-9A-Fa-f]{6}$/.test(trimmed)) return null;

  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (withoutHash.length === 3) {
    const r = withoutHash[0];
    const g = withoutHash[1];
    const b = withoutHash[2];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return `#${withoutHash.toUpperCase()}`;
};

const hexToRgba = (hex: string, alpha: number): string => {
  const sanitized = normalizeHexColor(hex) ?? DEFAULT_HEX_COLOR;
  const r = parseInt(sanitized.slice(1, 3), 16);
  const g = parseInt(sanitized.slice(3, 5), 16);
  const b = parseInt(sanitized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getRoutineColorStyles = (routine: ScheduledRoutine) => {
  const baseHex =
    normalizeHexColor(routine.routine.level?.color || routine.routine.color) ??
    DEFAULT_HEX_COLOR;

  return {
    borderColor: baseHex,
    backgroundColor: hexToRgba(baseHex, 0.18),
    titleColor: baseHex,
  };
};

export const generateSchedulePDF = (scheduledRoutines: ScheduledRoutine[], rangeDates: Date[], rooms?: Room[]) => {
  // Create a simple HTML document for PDF generation
  const htmlContent = generateScheduleHTML(scheduledRoutines, rangeDates, rooms);
  
  // Use print dialog method which handles CSS Grid much better
  // Browsers will remember "Save as PDF" selection after first use
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then trigger print
    // The browser will remember the last print destination (Save as PDF)
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
        .level-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border-radius: 9999px;
          background: var(--badge-bg, #E5E7EB);
          border: 1px solid var(--badge-border, #D1D5DB);
          color: var(--badge-text, #374151);
          white-space: nowrap;
        }
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
            <th style="width: 140px;">Level</th>
            <th style="width: 160px;">Teacher</th>
            <th>Dancers</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(r => {
            const styles = getRoutineColorStyles(r);
            const levelBadge = r.routine.level
              ? `<span class="level-badge" style="--badge-bg: ${styles.backgroundColor}; --badge-border: ${styles.borderColor}; --badge-text: ${styles.titleColor};">${r.routine.level.name}</span>`
              : '<span class="level-badge">N/A</span>';

            return `
            <tr>
              <td>${parseLocalDate(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</td>
              <td>${formatTime(r.startTime.hour, r.startTime.minute)}</td>
              <td>${formatTime(r.endTime.hour, r.endTime.minute)}</td>
              <td>${r.roomId}</td>
              <td>${r.routine.songTitle}</td>
              <td>${levelBadge}</td>
              <td>${r.routine.teacher.name}</td>
              <td class="muted">${r.routine.dancers.map(d => d.name).join(', ')}</td>
            </tr>
          `;
          }).join('')}
        </tbody>
      </table>

      
    </body>
    </html>
  `;
};

const generateMultiDayCalendarGridHTML = (scheduledRoutines: ScheduledRoutine[], rangeDates: Date[], rooms: Room[]) => {
  console.log(`[PDF] ===== Starting PDF Generation =====`);
  console.log(`[PDF] Input: ${scheduledRoutines.length} scheduled routines`);
  console.log(`[PDF] Date range: ${rangeDates.length} days`);
  console.log(`[PDF] Rooms: ${rooms.length} total (${rooms.filter(r => r.isActive).length} active)`);
  
  // Filter out any invalid routines (defensive check)
  const validRoutines = scheduledRoutines.filter(routine => {
    const isValid = routine && 
           routine.date && 
           routine.roomId && 
           routine.routine && 
           routine.startTime && 
           routine.endTime &&
           typeof routine.date === 'string' &&
           routine.date.match(/^\d{4}-\d{2}-\d{2}$/); // Ensure date is in YYYY-MM-DD format
    
    if (!isValid) {
      console.warn('[PDF] Filtered out invalid routine:', {
        id: routine?.id,
        hasDate: !!routine?.date,
        hasRoomId: !!routine?.roomId,
        hasRoutine: !!routine?.routine,
        hasStartTime: !!routine?.startTime,
        hasEndTime: !!routine?.endTime,
        dateFormat: typeof routine?.date === 'string' ? routine.date : 'not string'
      });
    }
    return isValid;
  });
  
  console.log(`[PDF] After validation: ${validRoutines.length} valid routines (filtered ${scheduledRoutines.length - validRoutines.length})`);

  // Group routines by date
  const routinesByDate = new Map<string, ScheduledRoutine[]>();
  validRoutines.forEach(routine => {
    // Normalize date string to ensure consistent format
    const normalizedDate = routine.date.trim();
    if (!routinesByDate.has(normalizedDate)) {
      routinesByDate.set(normalizedDate, []);
    }
    routinesByDate.get(normalizedDate)!.push(routine);
  });

  // Get unique dates that have schedules, sorted (keep as strings to avoid timezone issues)
  const datesWithSchedules = Array.from(routinesByDate.keys()).sort();

  // Generate one page per day (only for days with schedules)
  console.log(`[PDF] Generating pages for ${datesWithSchedules.length} days with schedules`);
  const dayPages = datesWithSchedules.map(dateStr => {
    // Parse the date string to create a Date object for display
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    // Use the original date string as the key to ensure we get the correct routines
    const dayRoutines = routinesByDate.get(dateStr) || [];
    console.log(`[PDF] Day ${dateStr}: ${dayRoutines.length} routines`);
    return generateCalendarGridBody(dayRoutines, date, rooms);
  });
  
  console.log(`[PDF] ===== PDF Generation Complete =====`);
  console.log(`[PDF] Generated ${dayPages.length} day pages`);

  // Combine all day pages with page breaks
  const formatDateString = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const dateLabel = datesWithSchedules.length === 1
    ? formatDateString(datesWithSchedules[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' }).toUpperCase()
    : `${formatDateString(datesWithSchedules[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${formatDateString(datesWithSchedules[datesWithSchedules.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

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
          padding: 6px 4px;
          text-align: center;
          font-weight: 600;
          font-size: 11px;
          color: #374151;
        }
        .time-column { 
          background: #F9FAFB; 
          text-align: center; 
          font-weight: 500;
          font-size: 9px;
          border: 1px solid #D1D5DB;
          padding: 4px;
        }
        .room-header { 
          background: #F3F4F6; 
          text-align: center; 
          font-weight: 600;
          font-size: 11px;
          padding: 6px 4px;
          border: 1px solid #D1D5DB;
        }
        .grid-row {
          display: contents;
        }
        .room-cell {
          border: 1px solid #D1D5DB;
          padding: 2px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          min-height: 8px;
          position: relative;
        }
        .room-cell.occupied {
          padding: 0;
        }
        .routine-block { 
          padding: 2px 4px;
          margin: 0;
          border-radius: 3px;
          background: var(--routine-bg, #EFF6FF);
          border-left: 2px solid var(--routine-border, #3B82F6);
          width: 100%;
          box-sizing: border-box;
          min-height: fit-content;
          height: 100%;
        }
        .routine-level {
          font-weight: 600;
          font-size: 8px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--routine-title, #1E40AF);
          margin-bottom: 2px;
        }
        .routine-title { 
          font-weight: 600; 
          font-size: 10px; 
          color: var(--routine-title, #1E40AF);
          margin-bottom: 2px;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .routine-time { 
          font-size: 9px; 
          color: #475569;
          margin-bottom: 2px;
          line-height: 1.2;
        }
        .routine-teacher { 
          font-size: 9px; 
          color: #64748B;
          margin-bottom: 2px;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .routine-dancers { 
          font-size: 7px; 
          color: #64748B; 
          line-height: 1.2;
          margin-top: 2px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: normal;
        }
        .empty-cell { 
          background: #FAFAFA; 
          min-height: 8px;
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
  // Format date as YYYY-MM-DD (date-only, no timezone)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  console.log(`[PDF] Generating calendar grid for date ${dateStr} with ${scheduledRoutines.length} routines`);
  
  // Filter out invalid routines (defensive check)
  const validRoutines = scheduledRoutines.filter(sr => {
    const hasBasicData = sr && 
           sr.routine && 
           sr.roomId && 
           sr.startTime && 
           sr.endTime &&
           sr.date;
    
    // Check if room exists (but don't require it to be active - inactive rooms might still have schedules)
    const roomExists = rooms.some(r => r.id === sr.roomId);
    
    if (!hasBasicData || !roomExists) {
      console.warn(`[PDF] Filtered out routine for ${dateStr}:`, {
        id: sr?.id,
        hasBasicData,
        roomExists,
        roomId: sr?.roomId,
        availableRooms: rooms.map(r => r.id)
      });
    }
    
    return hasBasicData && roomExists;
  });
  
  console.log(`[PDF] Date ${dateStr}: ${validRoutines.length} valid routines (filtered ${scheduledRoutines.length - validRoutines.length})`);

  // Show all active rooms, not just rooms with schedules
  // This ensures all studios are visible even if they have no schedules for the day
  const activeRooms = rooms
    .filter(r => r.isActive)
    .sort((a, b) => a.id.localeCompare(b.id));

  // Find time range for the day
  let minHour = 24;
  let maxHour = 0;
  validRoutines.forEach(sr => {
    if (sr.startTime && sr.endTime) {
      const startMin = sr.startTime.hour * 60 + sr.startTime.minute;
      const endMin = sr.endTime.hour * 60 + sr.endTime.minute;
      minHour = Math.min(minHour, Math.floor(startMin / 60));
      maxHour = Math.max(maxHour, Math.ceil(endMin / 60));
    }
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
  
  // Track which routines we've successfully placed
  const placedRoutineIds = new Set<string>();
  
  // First, find all routines and determine which time slot row they should start in
  validRoutines.forEach(routine => {
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
    
    // If we didn't find an exact match, find the closest earlier slot
    if (startRowIndex === -1) {
      for (let i = timeSlots.length - 1; i >= 0; i--) {
        const slotStart = timeSlots[i].hour * 60 + timeSlots[i].minute;
        if (slotStart <= routineStart) {
          startRowIndex = i;
          break;
        }
      }
    }
    
    // If we found a starting row, find the room index
    if (startRowIndex >= 0) {
      const roomIndex = activeRooms.findIndex(r => r.id === routine.roomId);
      if (roomIndex >= 0) {
        const cellKey = `${startRowIndex}-${roomIndex}`;
        const rowSpan = getRowSpan(routine);
        cellMap.set(cellKey, { routine, rowSpan });
        placedRoutineIds.add(routine.id);
        
        // Mark subsequent rows as occupied by this routine
        for (let i = 1; i < rowSpan; i++) {
          const nextRowKey = `${startRowIndex + i}-${roomIndex}`;
          if (!cellMap.has(nextRowKey)) {
            cellMap.set(nextRowKey, null); // null means occupied but not rendered here
          }
        }
      } else {
        console.warn(`[PDF] Routine ${routine.id} has roomId ${routine.roomId} that doesn't exist in active rooms`);
      }
    } else {
      console.warn(`[PDF] Could not find time slot for routine ${routine.id} starting at ${routine.startTime.hour}:${routine.startTime.minute}`);
    }
  });
  
  // Verify all routines were placed
  if (placedRoutineIds.size !== validRoutines.length) {
    const missingIds = validRoutines
      .filter(r => !placedRoutineIds.has(r.id))
      .map(r => r.id);
    console.warn(`[PDF] Warning: ${missingIds.length} routines were not placed in the grid:`, missingIds);
  }
  
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
                  const styles = getRoutineColorStyles(routine);
                  const dancerNames = routine.routine.dancers.map(d => d.name).join(', ');
                  return `
                    <div class="room-cell occupied" style="grid-row: span ${rowSpan};">
                      <div class="routine-block" style="--routine-bg: ${styles.backgroundColor}; --routine-border: ${styles.borderColor}; --routine-title: ${styles.titleColor};">
                        ${
                          routine.routine.level
                            ? `<div class="routine-level">${routine.routine.level.name}</div>`
                            : ''
                        }
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
