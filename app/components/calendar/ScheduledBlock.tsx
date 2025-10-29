'use client';

import React, { useRef, useEffect } from 'react';
import { ScheduledRoutine } from '../../types/schedule';
import { formatTime } from '../../utils/timeUtils';
import { useDrag } from 'react-dnd';
import { X } from 'lucide-react';

interface ScheduledBlockProps {
  routine: ScheduledRoutine;
  onClick: () => void;
  onDelete?: (routine: ScheduledRoutine) => void;
  timeInterval?: number; // Time interval in minutes (15, 30, or 60)
}

export const ScheduledBlock: React.FC<ScheduledBlockProps> = ({ routine, onClick, onDelete, timeInterval = 60 }) => {
  const duration = routine.duration;
  const slotHeight = 64; // h-16 = 64px
  // Calculate height based on duration and time interval
  // Each time slot is 64px tall, so we need (duration / timeInterval) slots
  const numberOfSlots = duration / timeInterval;
  const height = Math.max(slotHeight, numberOfSlots * slotHeight);

  // Check if this routine has conflicts
  const hasConflicts = routine.routine.dancers.some(dancer => 
    routine.routine.dancers.filter(d => d.id === dancer.id).length > 1
  );

  // Make the block draggable
  const [{ isDragging }, drag] = useDrag({
    type: 'scheduled-routine',
    item: { 
      type: 'scheduled-routine',
      routine: routine,
      originalTimeSlot: {
        hour: routine.startTime.hour,
        minute: routine.startTime.minute,
        day: routine.startTime.day,
        roomId: routine.roomId
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      drag(ref.current);
    }
  }, [drag]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(routine);
    }
  };

  return (
    <div
      ref={ref}
      className={`
        absolute left-0 right-0 z-10 cursor-move rounded-lg border-2 p-2
        hover:shadow-lg transition-all duration-200 group
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${hasConflicts ? 'border-red-500 bg-red-100 shadow-lg' : 
          routine.routine.dancers.length > 0 ? 'border-blue-300' : 'border-gray-300'}
      `}
      style={{
        height: `${height}px`,
        backgroundColor: hasConflicts ? '#fef2f2' : routine.routine.color + '20', // 20% opacity
        borderColor: hasConflicts ? '#ef4444' : routine.routine.color,
        top: '2px',
        left: '2px',
        right: '2px'
      }}
      onClick={onClick}
    >
      <div className="h-full flex flex-col justify-between">
        <div>
          <div className={`font-semibold text-sm truncate ${hasConflicts ? 'text-red-900' : 'text-gray-900'}`}>
            {routine.routine.songTitle}
            {hasConflicts && <span className="text-red-600 ml-1">⚠️</span>}
          </div>
          <div className={`text-xs truncate ${hasConflicts ? 'text-red-700' : 'text-gray-600'}`}>
            {routine.routine.teacher.name}
          </div>
          {isDragging && (
            <div className="text-xs text-blue-600 font-bold mt-1">
              Moving...
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className={hasConflicts ? 'text-red-600 font-bold' : 'text-gray-500'}>
            {formatTime(routine.startTime.hour, routine.startTime.minute)}
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${hasConflicts ? 'bg-red-500' : 'bg-blue-500'}`}></div>
            <span className={hasConflicts ? 'text-red-600 font-bold' : 'text-gray-600'}>
              {routine.routine.dancers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Delete button - appears on hover */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
          title="Delete routine"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
