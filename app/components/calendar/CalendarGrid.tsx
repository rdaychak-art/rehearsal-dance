'use client';

import React, { useState, useMemo } from 'react';
import { Room } from '../../types/room';
import { ScheduledRoutine } from '../../types/schedule';
import { Routine, Level } from '../../types/routine';
import { TimeSlot } from './TimeSlot';
import { ScheduledBlock } from './ScheduledBlock';
import { formatTime, getShortDayName, addMinutesToTime } from '../../utils/timeUtils';
import { findConflicts } from '../../utils/conflictUtils';
import { ChevronLeft, ChevronRight, Calendar, Save, AlertCircle, X, ChevronDown } from 'lucide-react';

interface CalendarGridProps {
  rooms: Room[];
  scheduledRoutines: ScheduledRoutine[];
  onDrop: (routine: Routine, timeSlot: { hour: number; minute: number; day: number; roomId: string; date: string }) => void;
  onRoutineClick: (routine: ScheduledRoutine) => void;
  onMoveRoutine: (routine: ScheduledRoutine, newTimeSlot: { hour: number; minute: number; day: number; roomId: string; date: string }) => void;
  onDeleteRoutine: (routine: ScheduledRoutine) => void;
  visibleRooms: number;
  hasUnsavedChanges?: boolean;
  onSaveChanges?: () => void;
  onResizeRoutineDuration?: (routine: ScheduledRoutine, newDuration: number) => void;
  levels?: Level[];
  selectedLevelIds?: string[];
  onLevelIdsChange?: (levelIds: string[]) => void;
}

type ViewMode = 'day' | '4days' | 'week' | 'month';

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  rooms,
  scheduledRoutines,
  onDrop,
  onRoutineClick,
  onMoveRoutine,
  onDeleteRoutine,
  visibleRooms,
  hasUnsavedChanges = false,
  onSaveChanges,
  onResizeRoutineDuration,
  levels = [],
  selectedLevelIds = [],
  onLevelIdsChange
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('4days');
  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(24);
  const [timeInterval, setTimeInterval] = useState(30);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  // Filter scheduled routines by selected levels (if provided)
  const filteredScheduledRoutines = useMemo(() => {
    if (!selectedLevelIds || selectedLevelIds.length === 0) {
      return scheduledRoutines;
    }
    return scheduledRoutines.filter(sr => {
      if (!sr.routine?.level || !sr.routine.level.id) return false;
      return selectedLevelIds.includes(sr.routine.level.id);
    });
  }, [scheduledRoutines, selectedLevelIds]);

  const getDatesForView = (date: Date, view: ViewMode): Date[] => {
    const dates: Date[] = [];
    
    // Helper to normalize date to midnight in local timezone
    const normalizeDate = (d: Date): Date => {
      const normalized = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      return normalized;
    };
    
    switch (view) {
      case 'day': {
        // Single day
        dates.push(normalizeDate(date));
        break;
      }
      case '4days': {
        // 4 consecutive days starting from the current date
        const baseDate = normalizeDate(date);
        for (let i = 0; i < 4; i++) {
          const day = new Date(baseDate);
          day.setDate(baseDate.getDate() + i);
          dates.push(day);
        }
        break;
      }
      case 'week': {
        // Week starting from Sunday
        const baseDate = normalizeDate(date);
        const dayOfWeek = baseDate.getDay();
        const diff = baseDate.getDate() - dayOfWeek;
        const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), diff, 0, 0, 0, 0);
        
        for (let i = 0; i < 7; i++) {
          const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 0, 0, 0, 0);
          dates.push(day);
        }
        break;
      }
      case 'month': {
        // Full month calendar grid
        const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 0, 0, 0, 0);
        
        // Start from the Sunday of the week containing the first day of the month
        const firstDay = start.getDay();
        start.setDate(start.getDate() - firstDay);
        
        // End on the Saturday of the week containing the last day of the month
        const lastDay = end.getDay();
        const daysToAdd = 6 - lastDay;
        end.setDate(end.getDate() + daysToAdd);
        
        const current = new Date(start);
        while (current <= end) {
          dates.push(new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0, 0, 0));
          current.setDate(current.getDate() + 1);
        }
        break;
      }
    }
    
    return dates;
  };

  const viewDates = getDatesForView(currentDate, viewMode);
  const activeRooms = rooms.filter(room => room.isActive).slice(0, visibleRooms);
  
  // Use filtered routines for display
  const displayRoutines = filteredScheduledRoutines;

  // Helper function to format date as YYYY-MM-DD using local timezone (not UTC)
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Highlight conflicts only where two routines overlap at this exact 15-min slot in this room
  const slotHasDancerConflict = (hh: number, mm: number, date: Date, roomId: string): boolean => {
    const dateStr = formatDateString(date);
    const slotMinute = hh * 60 + mm;
    // Routine in this room covering this slot
    const routineHere = displayRoutines.find(sr => {
      if (sr.roomId !== roomId) return false;
      if (sr.date !== dateStr) return false;
      const start = sr.startTime.hour * 60 + sr.startTime.minute;
      const end = start + sr.duration; // exclusive
      return slotMinute >= start && slotMinute < end;
    });
    if (!routineHere) return false;
    const dancersHere = new Set((routineHere.routine?.dancers || []).map(d => d.id));
    // Any other routine (any room) that also covers this slot and shares a dancer?
    for (const other of displayRoutines) {
      if (other.id === routineHere.id) continue;
      if (other.date !== dateStr) continue;
      const oStart = other.startTime.hour * 60 + other.startTime.minute;
      const oEnd = oStart + other.duration;
      if (slotMinute >= oStart && slotMinute < oEnd) {
        const overlap = (other.routine?.dancers || []).some(d => dancersHere.has(d.id));
        if (overlap) return true;
      }
    }
    return false;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case '4days':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 4 : -4));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateRange = () => {
    if (viewDates.length === 0) return '';
    
    switch (viewMode) {
      case 'day': {
        const date = viewDates[0];
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
      case '4days': {
        const start = viewDates[0];
        const end = viewDates[viewDates.length - 1];
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }
      case 'week': {
        const start = viewDates[0];
        const end = viewDates[6];
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      case 'month': {
        const date = viewDates[0];
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      default:
        return '';
    }
  };


  // Get routine for specific time slot and room
  const getRoutineForSlot = (hour: number, minute: number, date: Date, roomId: string): ScheduledRoutine | null => {
    const dateStr = formatDateString(date); // YYYY-MM-DD format using local timezone
    return displayRoutines.find(routine => 
      routine.roomId === roomId &&
      routine.date === dateStr &&
      routine.startTime.hour === hour &&
      routine.startTime.minute === minute
    ) || null;
  };

  // hasConflicts helper removed (unused)

  // Generate time slots
  const timeSlots: Array<{ hour: number; minute: number }> = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += timeInterval) {
      timeSlots.push({ hour, minute });
    }
  }
  
  // Add some extra content to ensure scrolling
  const totalTimeSlots = timeSlots.length;
  console.log(`Generated ${totalTimeSlots} time slots from ${startHour}:00 to ${endHour}:00`);
  console.log(`Calendar dimensions: ${activeRooms.length} rooms × 7 days = ${activeRooms.length * 7} columns`);

  return (
    <div className="flex-1 bg-white flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Save Changes Button */}
            {hasUnsavedChanges && onSaveChanges && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <button
                  onClick={onSaveChanges}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            )}
            
            <div className="text-sm text-gray-600">
              {formatDateRange()}
            </div>
            
            {/* View Toggle Buttons */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('4days')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === '4days' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                4 Days
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Month
              </button>
            </div>
            
            
            {viewMode !== 'month' && (
            <div className="flex items-center gap-2">
              <select
                value={`${startHour}-${endHour}`}
                onChange={(e) => {
                  const [start, end] = e.target.value.split('-').map(Number);
                  setStartHour(start);
                  setEndHour(end);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value="6-24">6 AM - 12 AM</option>
                <option value="8-22">8 AM - 10 PM</option>
                <option value="9-21">9 AM - 9 PM</option>
                <option value="10-20">10 AM - 8 PM</option>
              </select>
              
              <select
                value={timeInterval}
                onChange={(e) => setTimeInterval(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-xs"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
              </select>

              {/* Level Filter */}
              {levels.length > 0 && onLevelIdsChange && (
                <div className="relative" style={{ zIndex: 1000 }}>
                  <button
                    type="button"
                    onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-left flex items-center gap-1 min-h-[28px]"
                  >
                    <span className="text-gray-600">
                      {selectedLevelIds.length === 0
                        ? 'All Levels'
                        : selectedLevelIds.length <= 2
                        ? selectedLevelIds
                            .map((levelId) => {
                              const level = levels.find((l) => l.id === levelId);
                              return level ? level.name : null;
                            })
                            .filter(Boolean)
                            .join(', ')
                        : `${selectedLevelIds.length} selected`}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-400 transition-transform ${
                        showLevelDropdown ? "transform rotate-180" : ""
                      }`}
                    />
                  </button>

                  {showLevelDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowLevelDropdown(false)}
                      />
                      <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-[200px]" style={{ zIndex: 1001 }}>
                        {levels.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500">
                            No levels available
                          </div>
                        ) : (
                          <>
                            <label className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 sticky top-0 bg-white">
                              <input
                                type="checkbox"
                                checked={
                                  selectedLevelIds.length === levels.length &&
                                  levels.length > 0
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    onLevelIdsChange(levels.map((l) => l.id));
                                  } else {
                                    onLevelIdsChange([]);
                                  }
                                }}
                                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-xs font-medium text-gray-700">
                                Select All
                              </span>
                            </label>
                            {levels.map((level) => (
                              <label
                                key={level.id}
                                className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLevelIds.includes(level.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      onLevelIdsChange([
                                        ...selectedLevelIds,
                                        level.id,
                                      ]);
                                    } else {
                                      onLevelIdsChange(
                                        selectedLevelIds.filter(
                                          (id) => id !== level.id
                                        )
                                      );
                                    }
                                  }}
                                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">
                                  {level.name}
                                </span>
                              </label>
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      </div>


      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto bg-white border-2 border-blue-200" style={{ 
        overflow: 'auto', 
        minHeight: '400px',
        height: 'calc(100vh - 300px)',
        overflowX: 'auto',
        overflowY: 'scroll',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="min-w-max bg-gray-50" style={{ minWidth: 'max-content' }}>
          {/* Days Header */}
          <div className="flex border-b border-gray-200 sticky top-0 bg-white z-30" style={{ minWidth: 'max-content', position: 'sticky', top: 0, backgroundColor: '#ffffff' }}>
            {/* Time column header */}
            <div className={`${viewMode === 'month' ? 'w-24' : 'w-24'} bg-gray-50 border-r border-gray-200 flex items-center justify-center sticky left-0 z-40`} style={{ position: 'sticky', left: 0, backgroundColor: '#f9fafb' }}>
              {viewMode === 'month' ? (
                <span className="text-xs font-medium text-gray-600"></span>
              ) : (
                <span className="text-xs font-medium text-gray-600">TIME</span>
              )}
            </div>
            
            {/* Days */}
            {viewMode === 'month' ? (
              // Month view: Week day headers
              <>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={idx} className="flex-1 border-r border-gray-200 last:border-r-0 p-2 text-center bg-gray-50">
                    <span className="text-xs font-medium text-gray-600">{day}</span>
                  </div>
                ))}
              </>
            ) : (
              // Day, 4 Days, Week views: Time-based grid headers
              <>
                {viewDates.map((date, dayIndex) => {
                  // Ensure we're using the correct day of week for this date
                  const dayOfWeek = date.getDay();
                  const dayNumber = date.getDate();
                  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                  
                  return (
                  <div key={dayIndex} className="border-r border-gray-200 last:border-r-0" style={{ minWidth: `${activeRooms.length * 120}px` }}>
                    <div className="bg-gray-50 border-b border-gray-200 p-4 text-center">
                      <div className="font-semibold text-gray-900 text-base">
                          {getShortDayName(dayOfWeek)}
                      </div>
                      <div className="text-sm text-gray-600">
                          {monthName} {dayNumber}
                      </div>
                    </div>
                    
                    {/* Room headers for this day */}
                    <div className="flex">
                      {activeRooms.map(room => (
                        <div key={room.id} className="border-r border-gray-200 last:border-r-0 p-3 text-center" style={{ width: '120px' }}>
                          <div className="text-sm font-medium text-gray-700">{room.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Month view calendar grid */}
          {viewMode === 'month' && (
            <>
              {Array.from({ length: Math.ceil(viewDates.length / 7) }, (_, weekIdx) => (
                <div key={weekIdx} className="flex border-b border-gray-200">
                  <div className="w-24 bg-gray-50 border-r border-gray-200 sticky left-0 z-20" style={{ position: 'sticky', left: 0, backgroundColor: '#f9fafb' }}></div>
                  {viewDates.slice(weekIdx * 7, (weekIdx + 1) * 7).map((date, dayIdx) => {
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    // Get routines for this day (match by actual date)
                    const dateStr = formatDateString(date); // YYYY-MM-DD format using local timezone
                    const dayRoutines = displayRoutines.filter(r => r.date === dateStr);
                    
                    return (
                      <div
                        key={dayIdx}
                        className="flex-1 border-r border-gray-200 last:border-r-0 p-2 min-h-[100px] bg-white"
                      >
                        <div className={`text-sm font-medium mb-1 ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayRoutines.slice(0, 3).map(routine => (
                            <div
                              key={routine.id}
                              className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: routine.routine.color || '#3b82f6', color: '#fff' }}
                              onClick={() => onRoutineClick(routine)}
                            >
                              {routine.routine.songTitle}
                            </div>
                          ))}
                          {dayRoutines.length > 3 && (
                            <div className="text-xs text-gray-500">+{dayRoutines.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {/* Time slots and grid - only for non-month views */}
          {viewMode !== 'month' && (
          <div className="flex" style={{ minWidth: 'max-content' }}>
            {/* Time column */}
            <div className="w-24 bg-gray-50 border-r border-gray-200 sticky left-0 z-20 flex-shrink-0" style={{ position: 'sticky', left: 0, backgroundColor: '#f9fafb' }}>
              {timeSlots.map(({ hour, minute }, index) => (
                <div key={index} className="h-8 border-b border-gray-200 flex items-center justify-center bg-white" style={{ backgroundColor: '#ffffff' }}>
                  <span className="text-sm text-gray-600 font-medium">
                    {formatTime(hour, minute)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            {viewDates.map((date, dayIndex) => (
              <div key={dayIndex} className="border-r border-gray-200 last:border-r-0 flex-shrink-0" style={{ minWidth: `${activeRooms.length * 120}px` }}>
                <div className="flex">
                  {activeRooms.map(room => (
                    <div key={room.id} className="border-r border-gray-200 last:border-r-0 flex-shrink-0 bg-white" style={{ width: '120px' }}>
                      {timeSlots.map(({ hour, minute }, timeIndex) => {
                        const dateStr = formatDateString(date); // YYYY-MM-DD format using local timezone
                        // Render sub-slots at 15-min granularity for better drop precision
                        if (timeInterval === 60) {
                          const subMinutes = [0, 15, 30, 45];
                          // Find any routine starting within this hour block
                          let foundRoutine: ScheduledRoutine | null = null;
                          let foundIndex = 0;
                          for (const m of subMinutes) {
                            const mm = minute + m;
                            const hh = hour + Math.floor(mm / 60);
                            const mmAdj = mm % 60;
                            const r = getRoutineForSlot(hh, mmAdj, date, room.id);
                            if (r) {
                              foundRoutine = r;
                              foundIndex = subMinutes.indexOf(m);
                              break;
                            }
                          }
                          return (
                            <React.Fragment key={timeIndex}>
                              {subMinutes.map((m, idx) => {
                                const mm = minute + m;
                                const hh = hour + Math.floor(mm / 60);
                                const mmAdj = mm % 60;
                                const hasConflict = slotHasDancerConflict(hh, mmAdj, date, room.id);
                                const hypothetical = foundRoutine
                                  ? {
                                      ...foundRoutine,
                                      startTime: { hour: hh, minute: mmAdj, day: date.getDay() },
                                      endTime: addMinutesToTime(
                                        { hour: hh, minute: mmAdj, day: date.getDay() },
                                        foundRoutine.duration
                                      ),
                                    }
                                  : null;
                                const hasConflictBlock = hypothetical
                                  ? findConflicts(displayRoutines, hypothetical, rooms).length > 0
                                  : false;
                                return (
                                  <TimeSlot
                                    key={`${timeIndex}-${idx}`}
                                    hour={hh}
                                    minute={mmAdj}
                                    day={date.getDay()}
                                    roomId={room.id}
                                    onDrop={(routine, timeSlot) => onDrop(routine, { ...timeSlot, date: dateStr })}
                                    onMoveRoutine={(routine, timeSlot) => onMoveRoutine(routine, { ...timeSlot, date: dateStr })}
                                    hasConflict={hasConflict}
                                    heightPx={8}
                                  >
                                    {foundRoutine && idx === foundIndex && (
                                      <ScheduledBlock
                                        routine={foundRoutine}
                                        onClick={() => onRoutineClick(foundRoutine!)}
                                        onDelete={onDeleteRoutine}
                                        timeInterval={timeInterval}
                                        onResizeDuration={onResizeRoutineDuration}
                                        offsetTopPx={0}
                                        hasConflict={hasConflictBlock}
                                      />
                                    )}
                                  </TimeSlot>
                                );
                              })}
                            </React.Fragment>
                          );
                        }
                        if (timeInterval === 30) {
                          const subMinutes = [0, 15];
                          let foundRoutine: ScheduledRoutine | null = null;
                          let foundIndex = 0;
                          for (const m of subMinutes) {
                            const mm = minute + m;
                            const hh = hour + Math.floor(mm / 60);
                            const mmAdj = mm % 60;
                            const r = getRoutineForSlot(hh, mmAdj, date, room.id);
                            if (r) {
                              foundRoutine = r;
                              foundIndex = subMinutes.indexOf(m);
                              break;
                            }
                          }
                          return (
                            <React.Fragment key={timeIndex}>
                              {subMinutes.map((m, idx) => {
                                const mm = minute + m;
                                const hh = hour + Math.floor(mm / 60);
                                const mmAdj = mm % 60;
                                const hasConflict = slotHasDancerConflict(hh, mmAdj, date, room.id);
                                const hypothetical = foundRoutine
                                  ? {
                                      ...foundRoutine,
                                      startTime: { hour: hh, minute: mmAdj, day: date.getDay() },
                                      endTime: addMinutesToTime(
                                        { hour: hh, minute: mmAdj, day: date.getDay() },
                                        foundRoutine.duration
                                      ),
                                    }
                                  : null;
                                const hasConflictBlock = hypothetical
                                  ? findConflicts(displayRoutines, hypothetical, rooms).length > 0
                                  : false;
                                return (
                                  <TimeSlot
                                    key={`${timeIndex}-${idx}`}
                                    hour={hh}
                                    minute={mmAdj}
                                    day={date.getDay()}
                                    roomId={room.id}
                                    onDrop={(routine, timeSlot) => onDrop(routine, { ...timeSlot, date: dateStr })}
                                    onMoveRoutine={(routine, timeSlot) => onMoveRoutine(routine, { ...timeSlot, date: dateStr })}
                                    hasConflict={hasConflict}
                                    heightPx={16}
                                  >
                                    {foundRoutine && idx === foundIndex && (
                                      <ScheduledBlock
                                        routine={foundRoutine}
                                        onClick={() => onRoutineClick(foundRoutine!)}
                                        onDelete={onDeleteRoutine}
                                        timeInterval={timeInterval}
                                        onResizeDuration={onResizeRoutineDuration}
                                        offsetTopPx={0}
                                        hasConflict={hasConflictBlock}
                                      />
                                    )}
                                  </TimeSlot>
                                );
                              })}
                            </React.Fragment>
                          );
                        }
                        // 15-min interval
                        const routine = getRoutineForSlot(hour, minute, date, room.id);
                        const hasConflict = slotHasDancerConflict(hour, minute, date, room.id);
                        const hasConflictBlock = routine ? findConflicts(displayRoutines, routine, rooms).length > 0 : false;
                        return (
                          <TimeSlot
                            key={timeIndex}
                            hour={hour}
                            minute={minute}
                            day={date.getDay()}
                            roomId={room.id}
                            onDrop={(routine, timeSlot) => onDrop(routine, { ...timeSlot, date: dateStr })}
                            onMoveRoutine={(routine, timeSlot) => onMoveRoutine(routine, { ...timeSlot, date: dateStr })}
                            hasConflict={hasConflict}
                            heightPx={32}
                          >
                            {routine && (
                              <ScheduledBlock
                                routine={routine}
                                onClick={() => onRoutineClick(routine)}
                                onDelete={onDeleteRoutine}
                                timeInterval={timeInterval}
                                onResizeDuration={onResizeRoutineDuration}
                                hasConflict={hasConflictBlock}
                              />
                            )}
                          </TimeSlot>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};


