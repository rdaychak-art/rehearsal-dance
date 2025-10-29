import { ScheduledRoutine } from '../types/schedule';
import { Room } from '../types/schedule';
import { formatTime, getShortDayName } from './timeUtils';

export interface DancerScheduleItem {
  scheduledRoutineId: string;
  routineId: string;
  songTitle: string;
  date: string;
  formattedDate: string;
  dayName: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomName: string;
  duration: number;
}

/**
 * Get all scheduled routines for a specific dancer
 * @param dancerId - The ID of the dancer
 * @param scheduledRoutines - Array of all scheduled routines
 * @param rooms - Array of all rooms (for getting room names)
 * @returns Array of schedule items for the dancer
 */
export const getDancerSchedules = (
  dancerId: string,
  scheduledRoutines: ScheduledRoutine[],
  rooms: Room[]
): DancerScheduleItem[] => {
  const dancerSchedules: DancerScheduleItem[] = [];

  scheduledRoutines.forEach((scheduledRoutine) => {
    // Check if this dancer is in the routine's dancers array
    const isInRoutine = scheduledRoutine.routine.dancers.some(
      (dancer) => dancer.id === dancerId
    );

    if (isInRoutine) {
      const room = rooms.find((r) => r.id === scheduledRoutine.roomId);
      const date = new Date(scheduledRoutine.date);
      
      dancerSchedules.push({
        scheduledRoutineId: scheduledRoutine.id,
        routineId: scheduledRoutine.routineId,
        songTitle: scheduledRoutine.routine.songTitle,
        date: scheduledRoutine.date,
        formattedDate: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        dayName: getShortDayName(scheduledRoutine.startTime.day),
        startTime: formatTime(
          scheduledRoutine.startTime.hour,
          scheduledRoutine.startTime.minute
        ),
        endTime: formatTime(
          scheduledRoutine.endTime.hour,
          scheduledRoutine.endTime.minute
        ),
        roomId: scheduledRoutine.roomId,
        roomName: room?.name || 'Unknown Room',
        duration: scheduledRoutine.duration
      });
    }
  });

  // Sort by date and then by start time
  dancerSchedules.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  return dancerSchedules;
};

