'use client';

import React, { useRef, useEffect } from 'react';
import { Routine } from '../../types/routine';
import { useRoutineDrag } from '../../hooks/useDragAndDrop';
import { GripVertical, Clock, Users } from 'lucide-react';

interface RoutineCardProps {
  routine: Routine;
  onClick: (routine: Routine) => void;
  isMaxed?: boolean;
  scheduledCount?: number;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({ routine, onClick, isMaxed = false, scheduledCount = 0 }) => {
  const { drag, isDragging } = useRoutineDrag(routine, !isMaxed);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current && !isMaxed) {
      drag(ref.current);
    }
  }, [drag, isMaxed]);
  

  return (
    <div
      ref={ref}
      className={`
        rounded-lg border-2 p-4 mb-3 transition-all duration-200
        ${isMaxed 
          ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60' 
          : 'bg-white border-gray-200 cursor-move hover:border-blue-300 hover:shadow-md'
        }
        ${isDragging ? 'opacity-50 scale-95' : ''}
      `}
      onClick={() => onClick(routine)}
      onMouseDown={() => console.log('RoutineCard mouse down:', routine.songTitle)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className={`w-3 h-3 rounded-full ${isMaxed ? 'opacity-50' : ''}`}
              style={{ backgroundColor: routine.color }}
            />
            <h3 className={`font-semibold text-sm ${isMaxed ? 'text-gray-500' : 'text-gray-900'}`}>
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
          
          <div className="mt-2 flex items-center gap-2">
            {routine.scheduledHours > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {routine.scheduledHours}h scheduled
              </span>
            )}
            {scheduledCount > 0 && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isMaxed 
                  ? 'bg-gray-300 text-gray-600' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {scheduledCount}/6 scheduled
              </span>
            )}
          </div>
        </div>
        
        <GripVertical className={`w-4 h-4 ${isMaxed ? 'text-gray-300' : 'text-gray-400'}`} />
      </div>
    </div>
  );
};
