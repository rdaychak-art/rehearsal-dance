import { Routine } from './routine';

export interface TimeSlot {
  hour: number;
  minute: number;
  day: number; // 0 = Sunday, 1 = Monday, etc.
}

export interface ScheduledRoutine {
  id: string;
  routineId: string;
  routine: Routine;
  roomId: string;
  startTime: TimeSlot;
  endTime: TimeSlot;
  duration: number; // in minutes
  date: string; // ISO date string (YYYY-MM-DD) for the actual date of this schedule
}

export interface Room {
  id: string;
  name: string;
  isActive: boolean;
  capacity?: number;
  equipment?: string[];
}

export interface Conflict {
  dancerId: string;
  dancerName: string;
  conflictingRoutines: Array<{
    routineTitle: string;
    studioName: string;
    studioId: string;
  }>;
  timeSlot: TimeSlot;
}

export interface CalendarView {
  type: 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  visibleRooms: number; // 1-8
}
