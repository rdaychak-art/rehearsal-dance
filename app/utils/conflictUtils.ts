import { ScheduledRoutine, Conflict, Room } from '../types/schedule';
import { isTimeSlotOverlapping } from './timeUtils';

export const findConflicts = (
  scheduledRoutines: ScheduledRoutine[],
  newRoutine: ScheduledRoutine,
  rooms: Room[]
): Conflict[] => {
  // Map to store conflicts grouped by dancer
  const conflictsByDancer = new Map<string, Conflict>();
  
  // Get all dancers in the new routine
  const newRoutineDancers = newRoutine.routine.dancers;
  
  // Check against all existing scheduled routines
  for (const existingRoutine of scheduledRoutines) {
    // Skip if it's the same routine
    if (existingRoutine.id === newRoutine.id) continue;
    
    // First check if they're on the same actual date
    if (existingRoutine.date !== newRoutine.date) continue;
    
    // Check if time slots overlap
    if (isTimeSlotOverlapping(
      newRoutine.startTime,
      newRoutine.endTime,
      existingRoutine.startTime,
      existingRoutine.endTime
    )) {
      // Find studio name for the existing routine
      const existingStudio = rooms?.find(room => room.id === existingRoutine.roomId);
      
      // Check for all conflicting dancers (not just the first one)
      const conflictingDancers = newRoutineDancers.filter(newDancer =>
        existingRoutine.routine.dancers.some(existingDancer =>
          existingDancer.id === newDancer.id
        )
      );
      
      // For each conflicting dancer, add/update their conflict entry
      for (const conflictingDancer of conflictingDancers) {
        const dancerId = conflictingDancer.id;
        
        if (!conflictsByDancer.has(dancerId)) {
          // Create new conflict entry for this dancer
          conflictsByDancer.set(dancerId, {
            dancerId: conflictingDancer.id,
            dancerName: conflictingDancer.name,
            conflictingRoutines: [{
              routineTitle: existingRoutine.routine.songTitle,
              studioName: existingStudio?.name || 'Unknown Studio',
              studioId: existingRoutine.roomId
            }],
            timeSlot: newRoutine.startTime
          });
        } else {
          // Add this conflicting routine to existing dancer's conflict list
          const existingConflict = conflictsByDancer.get(dancerId)!;
          existingConflict.conflictingRoutines.push({
            routineTitle: existingRoutine.routine.songTitle,
            studioName: existingStudio?.name || 'Unknown Studio',
            studioId: existingRoutine.roomId
          });
        }
      }
    }
  }
  
  // Convert map to array
  return Array.from(conflictsByDancer.values());
};

export const hasConflicts = (
  scheduledRoutines: ScheduledRoutine[],
  newRoutine: ScheduledRoutine,
  rooms: Room[]
): boolean => {
  return findConflicts(scheduledRoutines, newRoutine, rooms).length > 0;
};

export const getConflictingDancers = (
  scheduledRoutines: ScheduledRoutine[],
  newRoutine: ScheduledRoutine,
  rooms: Room[]
): string[] => {
  const conflicts = findConflicts(scheduledRoutines, newRoutine, rooms);
  return conflicts.map(conflict => conflict.dancerName);
};

/**
 * Checks if a room/studio already has a routine scheduled at overlapping times
 * Returns the conflicting scheduled routine if found, null otherwise
 */
export const checkRoomConflict = (
  scheduledRoutines: ScheduledRoutine[],
  newRoutine: ScheduledRoutine
): ScheduledRoutine | null => {
  for (const existingRoutine of scheduledRoutines) {
    // Skip if it's the same routine
    if (existingRoutine.id === newRoutine.id) continue;
    
    // Must be in the same room
    if (existingRoutine.roomId !== newRoutine.roomId) continue;
    
    // Must be on the same date
    if (existingRoutine.date !== newRoutine.date) continue;
    
    // Check if time slots overlap
    if (isTimeSlotOverlapping(
      newRoutine.startTime,
      newRoutine.endTime,
      existingRoutine.startTime,
      existingRoutine.endTime
    )) {
      return existingRoutine;
    }
  }
  
  return null;
};
