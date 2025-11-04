'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ScheduledRoutine } from '../../types/schedule';
import { formatTime } from '../../utils/timeUtils';
import { useDrag } from 'react-dnd';
import { X } from 'lucide-react';

interface ScheduledBlockProps {
  routine: ScheduledRoutine;
  onClick: () => void;
  onDelete?: (routine: ScheduledRoutine) => void;
  timeInterval?: number; // Time interval in minutes (15, 30, or 60)
  onResizeDuration?: (routine: ScheduledRoutine, newDuration: number) => void;
  snapMinutes?: number; // snap granularity for resizing (default 15)
  offsetTopPx?: number; // visual top offset within the containing hour/half-hour block
  hasConflict?: boolean; // externally determined conflict state
}

export const ScheduledBlock: React.FC<ScheduledBlockProps> = ({ routine, onClick, onDelete, timeInterval = 30, onResizeDuration, snapMinutes = 15, offsetTopPx = 0, hasConflict = false }) => {
  const duration = routine.duration;
  const slotHeight = 32; // h-8 = 32px
  const minBlockHeight = 20; // ensure visibility/clickability for very short durations
  // Calculate height based on duration and time interval
  // Each time slot is 32px tall, so we need (duration / timeInterval) slots
  const numberOfSlots = duration / timeInterval;
  const [previewHeight, setPreviewHeight] = useState<number | null>(null);
  const height = Math.max(minBlockHeight, (previewHeight ?? (numberOfSlots * slotHeight)));
  const isCompact = duration < timeInterval;

  // Conflict state is passed in from parent (computed using findConflicts)

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
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startDurationRef = useRef(duration);
  const containerTopRef = useRef<number | null>(null);
  const didResizeRef = useRef(false);
  const suppressClickRef = useRef(false);
  
  useEffect(() => {
    if (dragHandleRef.current) {
      drag(dragHandleRef.current);
    }
  }, [drag]);

  useEffect(() => {
    // reset preview if routine changes
    setPreviewHeight(null);
  }, [routine.id, routine.duration]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(routine);
    }
  };

  const snapTo = useCallback((minutes: number) => {
    const s = snapMinutes > 0 ? snapMinutes : 15;
    return Math.max(1, Math.round(minutes / s) * s);
  }, [snapMinutes]);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    resizingRef.current = true;
    startYRef.current = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    startDurationRef.current = routine.duration;
    containerTopRef.current = ref.current?.getBoundingClientRect().top ?? null;
    didResizeRef.current = false;

    // Add listeners on document to capture mouse move outside block
    document.addEventListener('mousemove', handleResizeMove as any);
    document.addEventListener('mouseup', handleResizeEnd as any);
    document.addEventListener('touchmove', handleResizeMove as any, { passive: false });
    document.addEventListener('touchend', handleResizeEnd as any);
  };

  const handleResizeMove = (e: MouseEvent | TouchEvent) => {
    if (!resizingRef.current) return;
    const currentY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    const deltaY = currentY - startYRef.current;
    // delta slots relative to one slot height
    const deltaSlots = deltaY / slotHeight;
    if (Math.abs(deltaY) > 2) {
      didResizeRef.current = true;
    }
    const rawNewDuration = startDurationRef.current + deltaSlots * timeInterval;
    const snappedDuration = snapTo(rawNewDuration);
    const minDuration = Math.max(snapTo(5), snapTo(1));
    const finalDuration = Math.max(minDuration, snappedDuration);
    const slots = finalDuration / timeInterval;
    setPreviewHeight(Math.max(minBlockHeight, slots * slotHeight));
    // prevent scroll on touch
    if ('touches' in e) {
      e.preventDefault();
    }
  };

  const handleResizeEnd = (e: MouseEvent | TouchEvent) => {
    if (!resizingRef.current) return;
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove as any);
    document.removeEventListener('mouseup', handleResizeEnd as any);
    document.removeEventListener('touchmove', handleResizeMove as any);
    document.removeEventListener('touchend', handleResizeEnd as any);

    // Compute final duration same as move
    const endY = 'changedTouches' in e ? (e as TouchEvent).changedTouches[0].clientY : (e as MouseEvent).clientY;
    const deltaY = endY - startYRef.current;
    const deltaSlots = deltaY / slotHeight;
    const rawNewDuration = startDurationRef.current + deltaSlots * timeInterval;
    const finalDuration = snapTo(rawNewDuration);
    setPreviewHeight(null);
    if (didResizeRef.current) {
      // prevent click from firing after resize completes
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 50);
    }
    if (onResizeDuration && finalDuration !== routine.duration) {
      onResizeDuration(routine, finalDuration);
    }
  };

  return (
    <div
      ref={ref}
      className={`
        absolute left-0 right-0 z-10 rounded-lg border select-none overflow-hidden
        ${isCompact ? 'p-1' : 'p-1'}
        hover:shadow-lg transition-all duration-200 group
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${hasConflict ? 'border-red-500 bg-red-100 shadow-lg' : 
          routine.routine.dancers.length > 0 ? 'border-blue-300' : 'border-gray-300'}
      `}
      style={{
        height: `${height}px`,
        backgroundColor: hasConflict ? '#fef2f2' : routine.routine.color + '20', // 20% opacity
        borderColor: hasConflict ? '#ef4444' : routine.routine.color,
        top: `${offsetTopPx}px`,
        left: '1px',
        right: '1px'
      }}
      onClick={(e) => {
        if (suppressClickRef.current || resizingRef.current) {
          e.stopPropagation();
          return;
        }
        onClick();
      }}
    >
      <div className="h-full flex flex-col justify-between overflow-hidden">
        {/* Drag handle (top area only) */}
        {isCompact ? (
          <div ref={dragHandleRef} className="cursor-move flex items-center justify-between gap-2">
          <div className={`text-xs font-semibold truncate leading-tight ${hasConflict ? 'text-red-900' : 'text-gray-900'}`} title={routine.routine.songTitle}>
            {routine.routine.songTitle}
            {hasConflict && <span className="text-red-600 ml-1">⚠️</span>}
            </div>
          <div className={`text-[10px] ${hasConflict ? 'text-red-700' : 'text-gray-600'}`}>
              {formatTime(routine.startTime.hour, routine.startTime.minute)}
            </div>
          </div>
        ) : (
          <>
            <div ref={dragHandleRef} className="cursor-move">
            <div className={`font-semibold text-sm truncate ${hasConflict ? 'text-red-900' : 'text-gray-900'}`} title={routine.routine.songTitle}>
                {routine.routine.songTitle}
              {hasConflict && <span className="text-red-600 ml-1">⚠️</span>}
              </div>
            <div className={`text-xs truncate ${hasConflict ? 'text-red-700' : 'text-gray-600'}`}>
            {routine.routine.teacher.name}
          </div>
          {isDragging && (
            <div className="text-xs text-blue-600 font-bold mt-1">
              Moving...
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs">
            <div className={hasConflict ? 'text-red-600 font-bold' : 'text-gray-500'}>
            {formatTime(routine.startTime.hour, routine.startTime.minute)}
          </div>
          <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${hasConflict ? 'bg-red-500' : 'bg-blue-500'}`}></div>
              <span className={hasConflict ? 'text-red-600 font-bold' : 'text-gray-600'}>
              {routine.routine.dancers.length}
            </span>
          </div>
        </div>
          </>
        )}
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

      {/* Resize handle at bottom */}
      {onResizeDuration && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-transparent group"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <div className="mx-auto w-8 h-1 rounded bg-gray-400 opacity-0 group-hover:opacity-100"></div>
        </div>
      )}
    </div>
  );
};
