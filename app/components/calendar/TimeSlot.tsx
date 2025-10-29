'use client';

import React, { useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { Routine } from '../../types/routine';
import { ScheduledRoutine } from '../../types/schedule';

interface TimeSlotProps {
  hour: number;
  minute: number;
  day: number;
  roomId: string;
  onDrop: (routine: Routine, timeSlot: { hour: number; minute: number; day: number; roomId: string }) => void;
  onMoveRoutine?: (routine: ScheduledRoutine, timeSlot: { hour: number; minute: number; day: number; roomId: string }) => void;
  isCurrentTime?: boolean;
  hasConflict?: boolean;
  children?: React.ReactNode;
}

export const TimeSlot: React.FC<TimeSlotProps> = ({
  hour,
  minute,
  day,
  roomId,
  onDrop,
  onMoveRoutine,
  isCurrentTime = false,
  hasConflict = false,
  children
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['routine', 'scheduled-routine'],
    drop: (item: { type: string; routine: Routine | ScheduledRoutine }, monitor) => {
      console.log('TimeSlot drop triggered:', { item, timeSlot: { hour, minute, day, roomId } });
      
      if (monitor.didDrop()) {
        console.log('Drop already handled by parent');
        return;
      }
      
      const timeSlot = { hour, minute, day, roomId };
      
      if (item.type === 'scheduled-routine' && onMoveRoutine) {
        // Moving an existing scheduled routine
        console.log('Moving scheduled routine:', (item.routine as ScheduledRoutine).routine.songTitle, 'to', timeSlot);
        onMoveRoutine(item.routine as ScheduledRoutine, timeSlot);
      } else if (item.type === 'routine' && onDrop) {
        // Dropping a new routine from sidebar
        console.log('Dropping new routine:', (item.routine as Routine).songTitle, 'to', timeSlot);
        onDrop(item.routine as Routine, timeSlot);
      } else {
        console.log('Drop conditions not met:', { 
          hasMoveRoutine: !!onMoveRoutine, 
          hasOnDrop: !!onDrop, 
          itemType: item.type 
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      drop(ref.current);
    }
  }, [drop]);

  return (
    <div
      ref={ref}
      className={`
        h-16 border-b border-gray-200 relative cursor-pointer
        ${isCurrentTime ? 'bg-red-50 border-red-200' : 'bg-white'}
        ${hasConflict ? 'bg-red-200 border-2 border-red-500 shadow-lg' : ''}
        ${isOver && canDrop ? 'bg-blue-100 border-blue-300' : ''}
        ${canDrop ? 'hover:bg-gray-50' : ''}
      `}
    >
      {/* Current time indicator */}
      {isCurrentTime && (
        <div className="absolute left-0 top-0 w-full h-0.5 bg-red-500 z-10" />
      )}
      
      {/* Conflict indicator */}
      {hasConflict && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      )}
      
      {/* Drop indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50" />
      )}
      
      {/* Debug info */}
      {isOver && (
        <div className="absolute top-0 left-0 text-xs bg-blue-500 text-white p-1 rounded">
          Drop zone active
        </div>
      )}
      
      {/* Children (scheduled blocks) */}
      {children}
    </div>
  );
};
