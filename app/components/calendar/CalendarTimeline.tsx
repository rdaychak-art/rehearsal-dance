'use client';

import React, { useState } from 'react';
import { Room } from '../../types/room';
import { ScheduledRoutine } from '../../types/schedule';
import { Routine } from '../../types/routine';
import { RoomRow } from './RoomRow';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatTime, getDayName } from '../../utils/timeUtils';

interface CalendarTimelineProps {
  rooms: Room[];
  scheduledRoutines: ScheduledRoutine[];
  onDrop: (routine: Routine, timeSlot: { hour: number; minute: number; day: number }) => void;
  onRoutineClick: (routine: ScheduledRoutine) => void;
  visibleRooms: number;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  rooms,
  scheduledRoutines,
  onDrop,
  onRoutineClick,
  visibleRooms
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [timeInterval, setTimeInterval] = useState(30);

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);
  const activeRooms = rooms.filter(room => room.isActive).slice(0, visibleRooms);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
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
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {formatWeekRange()}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
        
        {/* Time Settings */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-gray-600">Time Range:</label>
            <select
              value={`${startHour}-${endHour}`}
              onChange={(e) => {
                const [start, end] = e.target.value.split('-').map(Number);
                setStartHour(start);
                setEndHour(end);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="6-22">6 AM - 10 PM</option>
              <option value="8-22">8 AM - 10 PM</option>
              <option value="9-21">9 AM - 9 PM</option>
              <option value="10-20">10 AM - 8 PM</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-gray-600">Interval:</label>
            <select
              value={timeInterval}
              onChange={(e) => setTimeInterval(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'week' ? (
          <div className="grid grid-cols-7 gap-0">
            {weekDates.map((date, dayIndex) => (
              <div key={dayIndex} className="border-r border-gray-200">
                {/* Day Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-3 text-center">
                  <div className="font-medium text-gray-900">
                    {getDayName(date.getDay())}
                  </div>
                  <div className="text-sm text-gray-600">
                    {date.getDate()}
                  </div>
                </div>
                
                {/* Time Column */}
                <div className="relative">
                  <div className="absolute left-0 top-0 w-12 bg-gray-50 border-r border-gray-200">
                    {Array.from({ length: (endHour - startHour) * (60 / timeInterval) }, (_, index) => {
                      const totalMinutes = startHour * 60 + index * timeInterval;
                      const hour = Math.floor(totalMinutes / 60);
                      const minute = totalMinutes % 60;
                      
                      if (hour >= endHour) return null;
                      
                      return (
                        <div key={`${hour}-${minute}`} className="h-16 border-b border-gray-200 flex items-start justify-center pt-1">
                          <span className="text-xs text-gray-500">
                            {formatTime(hour, minute)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Room Rows */}
                  <div className="ml-12">
                    {activeRooms.map(room => (
                      <RoomRow
                        key={room.id}
                        room={room}
                        scheduledRoutines={scheduledRoutines.filter(r => r.startTime.day === date.getDay())}
                        onDrop={onDrop}
                        onRoutineClick={onRoutineClick}
                        startHour={startHour}
                        endHour={endHour}
                        timeInterval={timeInterval}
                        currentDay={date.getDay()}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Day view implementation
          <div className="p-4">
            <div className="text-center text-gray-500">
              Day view implementation coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
