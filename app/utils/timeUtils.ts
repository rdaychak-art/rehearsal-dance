import { TimeSlot } from '../types/schedule';

export const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
};

export const formatTimeSlot = (timeSlot: TimeSlot): string => {
  return formatTime(timeSlot.hour, timeSlot.minute);
};

export const getDayName = (day: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};

export const getShortDayName = (day: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
};

export const timeToMinutes = (hour: number, minute: number): number => {
  return hour * 60 + minute;
};

export const minutesToTime = (minutes: number): { hour: number; minute: number } => {
  return {
    hour: Math.floor(minutes / 60),
    minute: minutes % 60
  };
};

export const addMinutesToTime = (timeSlot: TimeSlot, minutes: number): TimeSlot => {
  const totalMinutes = timeToMinutes(timeSlot.hour, timeSlot.minute) + minutes;
  const newTime = minutesToTime(totalMinutes);
  return {
    hour: newTime.hour,
    minute: newTime.minute,
    day: timeSlot.day
  };
};

export const getTimeSlots = (startHour: number = 8, endHour: number = 22, interval: number = 30): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      slots.push({ hour, minute, day: 0 }); // Default to Sunday, will be overridden
    }
  }
  
  return slots;
};

export const isTimeSlotOverlapping = (
  start1: TimeSlot,
  end1: TimeSlot,
  start2: TimeSlot,
  end2: TimeSlot
): boolean => {
  // First check if they're on the same day - only check time overlap if same day
  if (start1.day !== start2.day) return false;
  
  const start1Minutes = timeToMinutes(start1.hour, start1.minute);
  const end1Minutes = timeToMinutes(end1.hour, end1.minute);
  const start2Minutes = timeToMinutes(start2.hour, start2.minute);
  const end2Minutes = timeToMinutes(end2.hour, end2.minute);
  
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
};
