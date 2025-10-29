'use client';

import React from 'react';
import { Room } from '../../types/room';
import { ScheduledRoutine } from '../../types/schedule';
import { Routine } from '../../types/routine';
import { TimeSlot } from './TimeSlot';
import { ScheduledBlock } from './ScheduledBlock';

interface RoomRowProps {
  room: Room;
  scheduledRoutines: ScheduledRoutine[];
  onDrop: (routine: Routine, timeSlot: { hour: number; minute: number; day: number }) => void;
  onRoutineClick: (routine: ScheduledRoutine) => void;
  startHour: number;
  endHour: number;
  timeInterval: number;
  currentDay: number;
}

export const RoomRow: React.FC<RoomRowProps> = ({
  room,
  scheduledRoutines,
  onDrop,
  onRoutineClick,
  startHour,
  endHour,
  timeInterval,
  currentDay
}) => {
  const getRoutineForTimeSlot = (hour: number, minute: number): ScheduledRoutine | null => {
    return scheduledRoutines.find(routine => 
      routine.roomId === room.id &&
      routine.startTime.day === currentDay &&
      routine.startTime.hour === hour &&
      routine.startTime.minute === minute
    ) || null;
  };

  const isCurrentTime = (hour: number, minute: number): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayOfWeek = now.getDay();
    
    return currentDayOfWeek === currentDay && 
           currentHour === hour && 
           Math.abs(currentMinute - minute) < timeInterval;
  };

  return (
    <div className="flex border-b border-gray-200">
      {/* Room Name */}
      <div className="w-32 bg-gray-50 border-r border-gray-200 p-3 flex items-center justify-center">
        <div className="text-center">
          <div className="font-medium text-gray-900 text-sm">{room.name}</div>
          {room.capacity && (
            <div className="text-xs text-gray-500">Max {room.capacity}</div>
          )}
        </div>
      </div>
      
      {/* Time Slots */}
      <div className="flex-1 relative">
        <div className="grid grid-cols-1">
          {Array.from({ length: (endHour - startHour) * (60 / timeInterval) }, (_, index) => {
            const totalMinutes = startHour * 60 + index * timeInterval;
            const hour = Math.floor(totalMinutes / 60);
            const minute = totalMinutes % 60;
            
            if (hour >= endHour) return null;
            
            const routine = getRoutineForTimeSlot(hour, minute);
            const isCurrent = isCurrentTime(hour, minute);
            
            return (
              <div key={`${hour}-${minute}`} className="relative">
                <TimeSlot
                  hour={hour}
                  minute={minute}
                  day={currentDay}
                  roomId={room.id}
                  onDrop={onDrop}
                  isCurrentTime={isCurrent}
                />
                
                {routine && (
                  <ScheduledBlock
                    routine={routine}
                    onClick={() => onRoutineClick(routine)}
                    timeInterval={timeInterval}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
