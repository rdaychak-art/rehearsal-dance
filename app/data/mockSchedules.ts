import { ScheduledRoutine, Room } from '../types/schedule';
import { mockRoutines } from './mockRoutines';

export const mockRooms: Room[] = [
  { id: 'room-1', name: 'Studio 1', isActive: true, capacity: 20 },
  { id: 'room-2', name: 'Studio 2', isActive: true, capacity: 15 },
  { id: 'room-3', name: 'Studio 3', isActive: true, capacity: 25 },
  { id: 'room-4', name: 'Studio 4', isActive: true, capacity: 18 },
  { id: 'room-5', name: 'Studio 5', isActive: false, capacity: 20 },
  { id: 'room-6', name: 'Studio 6', isActive: false, capacity: 15 },
  { id: 'room-7', name: 'Studio 7', isActive: false, capacity: 25 },
  { id: 'room-8', name: 'Studio 8', isActive: false, capacity: 18 }
];

// Helper function to get Monday of current week
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Get dates for this week
const today = new Date();
const monday = getMondayOfWeek(today);
const tuesday = new Date(monday);
tuesday.setDate(monday.getDate() + 1);

const mondayStr = monday.toISOString().split('T')[0];
const tuesdayStr = tuesday.toISOString().split('T')[0];

export const mockScheduledRoutines: ScheduledRoutine[] = [
  {
    id: 'scheduled-1',
    routineId: 'routine-1',
    routine: mockRoutines[0],
    roomId: 'room-1',
    startTime: { hour: 10, minute: 0, day: 1 }, // Monday 10:00 AM
    endTime: { hour: 11, minute: 0, day: 1 },
    duration: 60,
    date: mondayStr
  },
  {
    id: 'scheduled-2',
    routineId: 'routine-2',
    routine: mockRoutines[1],
    roomId: 'room-2',
    startTime: { hour: 11, minute: 0, day: 1 }, // Monday 11:00 AM
    endTime: { hour: 12, minute: 0, day: 1 },
    duration: 60,
    date: mondayStr
  },
  {
    id: 'scheduled-3',
    routineId: 'routine-3',
    routine: mockRoutines[2],
    roomId: 'room-3',
    startTime: { hour: 14, minute: 0, day: 1 }, // Monday 2:00 PM
    endTime: { hour: 15, minute: 0, day: 1 },
    duration: 60,
    date: mondayStr
  },
  {
    id: 'scheduled-4',
    routineId: 'routine-4',
    routine: mockRoutines[3],
    roomId: 'room-1',
    startTime: { hour: 10, minute: 0, day: 2 }, // Tuesday 10:00 AM
    endTime: { hour: 11, minute: 0, day: 2 },
    duration: 60,
    date: tuesdayStr
  },
  {
    id: 'scheduled-5',
    routineId: 'routine-5',
    routine: mockRoutines[4],
    roomId: 'room-2',
    startTime: { hour: 11, minute: 0, day: 2 }, // Tuesday 11:00 AM
    endTime: { hour: 12, minute: 0, day: 2 },
    duration: 60,
    date: tuesdayStr
  },
  // Conflict example - Emma Rodriguez is in both routines at the same time
  {
    id: 'scheduled-6',
    routineId: 'routine-6',
    routine: mockRoutines[5],
    roomId: 'room-4',
    startTime: { hour: 14, minute: 0, day: 2 }, // Tuesday 2:00 PM
    endTime: { hour: 15, minute: 0, day: 2 },
    duration: 60,
    date: tuesdayStr
  },
  {
    id: 'scheduled-7',
    routineId: 'routine-7',
    routine: mockRoutines[6],
    roomId: 'room-3',
    startTime: { hour: 14, minute: 0, day: 2 }, // Tuesday 2:00 PM - CONFLICT!
    endTime: { hour: 15, minute: 0, day: 2 },
    duration: 60,
    date: tuesdayStr
  }
];
