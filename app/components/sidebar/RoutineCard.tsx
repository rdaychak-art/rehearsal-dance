'use client';

import React, { useRef, useEffect } from 'react';
import { Routine } from '../../types/routine';
import { useRoutineDrag } from '../../hooks/useDragAndDrop';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

interface RoutineCardProps {
  routine: Routine;
  onClick: (routine: Routine) => void;
  onToggleInactive?: (routine: Routine) => void;
  scheduledCount?: number;
  scheduledHours?: number;
  isInactive?: boolean;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({ routine, onClick, onToggleInactive, scheduledCount = 0, scheduledHours = 0, isInactive = false }) => {
  const { drag, isDragging } = useRoutineDrag(routine, !isInactive);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current && !isInactive) {
      drag(ref.current);
    }
  }, [drag, isInactive]);
  

  return (
    <div
      ref={ref}
      className={`
        rounded-lg border-2 p-4 mb-3 transition-all duration-200
        ${isInactive
          ? 'bg-gray-50 border-gray-200 opacity-50 cursor-pointer hover:opacity-70'
          : 'bg-white border-gray-200 cursor-move hover:border-blue-300 hover:shadow-md'
        }
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      onClick={(e) => {
        // Don't trigger onClick if clicking the toggle button
        if ((e.target as HTMLElement).closest('.toggle-inactive')) {
          return;
        }
        onClick(routine);
      }}
      onMouseDown={() => console.log('RoutineCard mouse down:', routine.songTitle)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className={`w-3 h-3 rounded-full ${isInactive ? 'opacity-50' : ''}`}
              style={{ backgroundColor: routine.color }}
            />
            <h3 className={`font-semibold text-sm ${isInactive ? 'text-gray-500' : 'text-gray-900'}`}>
              {routine.songTitle}
            </h3>
          </div>
{/*           
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{routine.dancers.length} dancers</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{routine.duration}min</span>
            </div>
          </div>
          
          <div className="mt-2">
            <span className="text-xs text-gray-500">
              {routine.teacher.name} • {routine.genre.name}
            </span>
          </div> */}
         
        </div>
        
        <div className="flex items-center gap-2">
          {onToggleInactive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleInactive(routine);
              }}
              className="toggle-inactive p-1 hover:bg-gray-200 rounded transition-colors"
              title={routine.isInactive ? 'Mark as active' : 'Mark as inactive'}
            >
              {routine.isInactive ? (
                <EyeOff className="w-4 h-4 text-gray-600" />
              ) : (
                <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
          <GripVertical className={`w-4 h-4 ${isInactive ? 'text-gray-300' : 'text-gray-400'}`} />
        </div>
      </div>
       
      <div className="mt-2 flex items-center gap-2 flex-wrap">
            {scheduledCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {scheduledCount} scheduled
              </span>
            )}
            {scheduledHours > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {scheduledHours.toFixed(1)}h scheduled
              </span>
            )}
          </div>
    </div>
  );
};
