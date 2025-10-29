'use client';

import { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster, toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// Components
import { RoutinesSidebar } from './components/sidebar/RoutinesSidebar';
import { CalendarGrid } from './components/calendar/CalendarGrid';
import { ToolsSidebar } from './components/sidebar/ToolsSidebar';
import { DancersList } from './components/dancers/DancersList';
import { RoutineDetailsModal } from './components/modals/RoutineDetailsModal';
import { ConflictWarningModal } from './components/modals/ConflictWarningModal';
import { EmailScheduleModal } from './components/modals/EmailScheduleModal';
import { ScheduledDancersModal } from './components/modals/ScheduledDancersModal';
import { CsvImportModal } from './components/modals/CsvImportModal';
import { DancerEditModal } from './components/modals/DancerEditModal';
import { DancerAddModal } from './components/modals/DancerAddModal';

// Types
import { Routine } from './types/routine';
import { ScheduledRoutine, Room } from './types/schedule';
import { Dancer } from './types/dancer';

// Data
import { mockTeachers, mockGenres } from './data/mockRoutines';
import { mockRooms } from './data/mockSchedules';

// Hooks
import { useConflictDetection } from './hooks/useConflictDetection';

// Utils
import { addMinutesToTime, formatTime } from './utils/timeUtils';
import { findConflicts, checkRoomConflict } from './utils/conflictUtils';

export default function Home() {
  // State
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [scheduledRoutines, setScheduledRoutines] = useState<ScheduledRoutine[]>([]);
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [visibleRooms, setVisibleRooms] = useState(4);
  const [showDancersList, setShowDancersList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savedScheduledRoutines, setSavedScheduledRoutines] = useState<ScheduledRoutine[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Modal states
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedScheduledRoutine, setSelectedScheduledRoutine] = useState<ScheduledRoutine | null>(null);
  const [showScheduledDancersModal, setShowScheduledDancersModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [selectedDancer, setSelectedDancer] = useState<Dancer | null>(null);
  const [showDancerEditModal, setShowDancerEditModal] = useState(false);
  const [showDancerAddModal, setShowDancerAddModal] = useState(false);
  
  // Initial data fetch
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [dancersRes, routinesRes, scheduledRes] = await Promise.all([
          fetch('/api/dancers'),
          fetch('/api/routines'),
          fetch('/api/scheduled')
        ]);
        const [dancersJson, routinesJson, scheduledJson] = await Promise.all([
          dancersRes.json(), routinesRes.json(), scheduledRes.json()
        ]);
        setDancers(dancersJson);
        setRoutines(routinesJson);
        // Map scheduled API to front-end ScheduledRoutine shape if needed
        const mapped: ScheduledRoutine[] = scheduledJson.map((it: {
          id: string;
          routineId: string;
          routine: Routine;
          roomId: string;
          startMinutes: number;
          duration: number;
          date: string;
        }) => {
          const startHour = Math.floor(it.startMinutes / 60);
          const startMinute = it.startMinutes % 60;
          const endMinutes = it.startMinutes + it.duration;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          const date = new Date(it.date);
          return {
            id: it.id,
            routineId: it.routineId,
            routine: it.routine,
            roomId: it.roomId,
            startTime: { hour: startHour, minute: startMinute, day: date.getDay() },
            endTime: { hour: endHour, minute: endMinute, day: date.getDay() },
            duration: it.duration,
            date: date.toISOString().split('T')[0]
          };
        });
        setScheduledRoutines(mapped);
        setSavedScheduledRoutines(mapped); // Store saved state for comparison
      } catch (e) {
        console.error('Failed to load initial data', e);
        toast.error('Failed to load data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Track unsaved changes
  useEffect(() => {
    // Compare current scheduledRoutines with saved ones
    const hasChanges = JSON.stringify(scheduledRoutines.map(sr => ({
      id: sr.id,
      routineId: sr.routineId,
      roomId: sr.roomId,
      date: sr.date,
      startTime: sr.startTime,
      duration: sr.duration
    })).sort((a, b) => a.id.localeCompare(b.id))) !== 
    JSON.stringify(savedScheduledRoutines.map(sr => ({
      id: sr.id,
      routineId: sr.routineId,
      roomId: sr.roomId,
      date: sr.date,
      startTime: sr.startTime,
      duration: sr.duration
    })).sort((a, b) => a.id.localeCompare(b.id)));
    
    setHasUnsavedChanges(hasChanges);
  }, [scheduledRoutines, savedScheduledRoutines]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Pending routine when conflicts are detected
  const [pendingScheduledRoutine, setPendingScheduledRoutine] = useState<ScheduledRoutine | null>(null);
  const [pendingRoutine, setPendingRoutine] = useState<Routine | null>(null);
  
  // Conflict detection
  const { conflicts, showConflictModal, checkConflicts, resolveConflicts, dismissConflicts } = useConflictDetection();

  // Get conflicts for display in sidebar
  const getConflictsForDisplay = () => {
    const conflictList: Array<{dancer: string, routines: string[], time: string}> = [];
    
    scheduledRoutines.forEach(routine => {
      const routineConflicts = findConflicts(scheduledRoutines, routine, rooms);
      if (routineConflicts.length > 0) {
        routineConflicts.forEach(conflict => {
          conflictList.push({
            dancer: conflict.dancerName,
            routines: conflict.conflictingRoutines.map(cr => `${cr.routineTitle} (${cr.studioName})`),
            time: formatTime(conflict.timeSlot.hour, conflict.timeSlot.minute)
          });
        });
      }
    });
    
    return conflictList;
  };

  // Handlers
  const handleRoutineClick = useCallback((routine: Routine) => {
    setSelectedRoutine(routine);
    setShowRoutineModal(true);
  }, []);

  const handleScheduledRoutineClick = useCallback((scheduledRoutine: ScheduledRoutine) => {
    setSelectedScheduledRoutine(scheduledRoutine);
    setShowScheduledDancersModal(true);
  }, []);

  const handleAddRoutine = useCallback(() => {
    const newRoutine: Routine = {
      id: `routine-${Date.now()}`,
      songTitle: 'New Routine',
      dancers: [],
      teacher: mockTeachers[0],
      genre: mockGenres[0],
      duration: 60,
      notes: '',
      scheduledHours: 0,
      color: mockGenres[0].color
    };
    setRoutines(prev => [...prev, newRoutine]);
    setSelectedRoutine(newRoutine);
    setShowRoutineModal(true);
  }, []);

  const handleSaveRoutine = useCallback(async (updatedRoutine: Routine) => {
    try {
      // Extract dancer IDs
      const dancerIds = updatedRoutine.dancers?.map(d => d.id) || [];
      
      // Check if this is a new routine (temporary ID) or existing one
      const isNewRoutine = updatedRoutine.id.startsWith('routine-') || !routines.some(r => r.id === updatedRoutine.id);
      
      // Save to database
      const res = await fetch('/api/routines', {
        method: isNewRoutine ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isNewRoutine ? {} : { id: updatedRoutine.id }),
          songTitle: updatedRoutine.songTitle,
          duration: updatedRoutine.duration,
          notes: updatedRoutine.notes,
          level: updatedRoutine.level,
          color: updatedRoutine.color,
          teacherId: updatedRoutine.teacher.id,
          genreId: updatedRoutine.genre.id,
          dancerIds: dancerIds,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to save routine');
      const saved = await res.json();
      
      // Update the routine in the routines array
      // If it was a new routine, replace it with the saved version (with DB ID)
      // Otherwise, update the existing one
      setRoutines(prev => {
        if (isNewRoutine) {
          // Remove temp routine and add saved one
          return prev.filter(r => r.id !== updatedRoutine.id).concat(saved);
        }
        return prev.map(r => r.id === saved.id ? saved : r);
      });
      
      // Also update all scheduled routines that reference this routine
      setScheduledRoutines(prev => prev.map(sr => {
        if (sr.routineId === saved.id) {
          // Update the routine data and recalculate endTime if duration changed
          const newDuration = saved.duration;
          const startMinutes = sr.startTime.hour * 60 + sr.startTime.minute;
          const endMinutes = startMinutes + newDuration;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          
          return { 
            ...sr, 
            routine: saved, 
            duration: newDuration,
            endTime: { hour: endHour, minute: endMinute, day: sr.startTime.day }
          };
        }
        return sr;
      }));
      
      toast.success('Routine saved successfully');
      setShowRoutineModal(false);
      setSelectedRoutine(null);
    } catch (e: unknown) {
      console.error('Failed to save routine:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to save routine';
      toast.error(errorMessage);
    }
  }, [routines]);

  const handleDeleteRoutine = useCallback((routineId: string) => {
    setRoutines(prev => prev.filter(r => r.id !== routineId));
    setScheduledRoutines(prev => prev.filter(sr => sr.routineId !== routineId));
    setShowRoutineModal(false);
    setSelectedRoutine(null);
  }, []);

  const handleDropRoutine = useCallback((routine: Routine, timeSlot: { hour: number; minute: number; day: number; roomId: string; date: string }) => {
    console.log('handleDropRoutine called:', { routine: routine.songTitle, timeSlot });
    
    const newScheduledRoutine: ScheduledRoutine = {
      id: `scheduled-${Date.now()}`,
      routineId: routine.id,
      routine: routine,
      roomId: timeSlot.roomId,
      startTime: { hour: timeSlot.hour, minute: timeSlot.minute, day: timeSlot.day },
      endTime: addMinutesToTime({ hour: timeSlot.hour, minute: timeSlot.minute, day: timeSlot.day }, routine.duration),
      duration: routine.duration,
      date: timeSlot.date // Store the actual date
    };

    console.log('New scheduled routine created:', newScheduledRoutine);

    // First check if the same routine is already scheduled at this exact time slot
    const sameRoutineAtSlot = scheduledRoutines.find(sr => {
      return sr.routineId === routine.id &&
             sr.roomId === timeSlot.roomId &&
             sr.date === timeSlot.date &&
             sr.startTime.hour === timeSlot.hour &&
             sr.startTime.minute === timeSlot.minute;
    });
    
    if (sameRoutineAtSlot) {
      const roomName = rooms.find(r => r.id === timeSlot.roomId)?.name || 'Studio';
      const conflictTime = formatTime(timeSlot.hour, timeSlot.minute);
      toast.error(`"${routine.songTitle}" is already scheduled at ${roomName} on ${conflictTime}. Cannot schedule the same routine twice at the same time slot.`);
      console.log('Same routine already scheduled at this time slot - cannot schedule routine');
      return;
    }

    // Check if the room/studio already has a routine at this time
    const roomConflict = checkRoomConflict(scheduledRoutines, newScheduledRoutine);
    if (roomConflict) {
      const roomName = rooms.find(r => r.id === timeSlot.roomId)?.name || 'Studio';
      const conflictTime = formatTime(roomConflict.startTime.hour, roomConflict.startTime.minute);
      toast.error(`${roomName} already has "${roomConflict.routine.songTitle}" scheduled at ${conflictTime}. Only one routine can be scheduled per studio at a time.`);
      console.log('Room conflict detected - cannot schedule routine');
      return;
    }

    // Check for dancer conflicts
    const hasConflicts = checkConflicts(scheduledRoutines, newScheduledRoutine, rooms);
    
    console.log('Conflict check result:', hasConflicts);
    console.log('Current scheduled routines:', scheduledRoutines.length);
    
    if (hasConflicts) {
      // Store as pending and wait for user decision
      console.log('Conflicts detected - storing routine as pending');
      setPendingScheduledRoutine(newScheduledRoutine);
      setPendingRoutine(routine);
      // Modal will be shown by checkConflicts
    } else {
      // No conflicts, add immediately
      console.log('No conflicts - adding routine to schedule');
      
      // Count how many times this routine is already scheduled
      const currentCount = scheduledRoutines.filter(sr => sr.routineId === routine.id).length;
      const newCount = currentCount + 1;
      
      // Add to state (don't save to database yet)
      setScheduledRoutines(prev => {
        const updated = [...prev, newScheduledRoutine];
        console.log('Updated scheduled routines:', updated.length);
        return updated;
      });
      
      // Update routine's scheduled hours (temporary)
      setRoutines(prev => prev.map(r => 
        r.id === routine.id 
          ? { ...r, scheduledHours: r.scheduledHours + (routine.duration / 60) }
          : r
      ));
      
      // Show notification if routine has reached 6 scheduled times
      if (newCount === 6) {
        toast.success(`${routine.songTitle} has been scheduled 6 times and is now maxed out.`, {
          duration: 4000,
          icon: '🔔',
        });
      }
      
      console.log('Routine added to schedule (not saved yet)');
    }
  }, [scheduledRoutines, checkConflicts, rooms]);

  const handleMoveRoutine = useCallback((routine: ScheduledRoutine, newTimeSlot: { hour: number; minute: number; day: number; roomId: string; date: string }) => {
    const updatedRoutine: ScheduledRoutine = {
      ...routine,
      roomId: newTimeSlot.roomId,
      startTime: { hour: newTimeSlot.hour, minute: newTimeSlot.minute, day: newTimeSlot.day },
      endTime: addMinutesToTime({ hour: newTimeSlot.hour, minute: newTimeSlot.minute, day: newTimeSlot.day }, routine.duration),
      date: newTimeSlot.date // Update the actual date
    };

    // First check if the same routine is already scheduled at this exact time slot (excluding the routine being moved)
    const otherRoutines = scheduledRoutines.filter(sr => sr.id !== routine.id);
    const sameRoutineAtSlot = otherRoutines.find(sr => {
      return sr.routineId === routine.routineId &&
             sr.roomId === newTimeSlot.roomId &&
             sr.date === newTimeSlot.date &&
             sr.startTime.hour === newTimeSlot.hour &&
             sr.startTime.minute === newTimeSlot.minute;
    });
    
    if (sameRoutineAtSlot) {
      const roomName = rooms.find(r => r.id === newTimeSlot.roomId)?.name || 'Studio';
      const conflictTime = formatTime(newTimeSlot.hour, newTimeSlot.minute);
      toast.error(`"${routine.routine.songTitle}" is already scheduled at ${roomName} on ${conflictTime}. Cannot schedule the same routine twice at the same time slot.`);
      console.log('Same routine already scheduled at this time slot - cannot move routine');
      return;
    }

    // Check if the room/studio already has a routine at this time (excluding the routine being moved)
    const roomConflict = checkRoomConflict(otherRoutines, updatedRoutine);
    if (roomConflict) {
      const roomName = rooms.find(r => r.id === newTimeSlot.roomId)?.name || 'Studio';
      const conflictTime = formatTime(roomConflict.startTime.hour, roomConflict.startTime.minute);
      toast.error(`${roomName} already has "${roomConflict.routine.songTitle}" scheduled at ${conflictTime}. Only one routine can be scheduled per studio at a time.`);
      console.log('Room conflict detected - cannot move routine');
      return;
    }

    // Check for dancer conflicts
    const hasConflicts = checkConflicts(otherRoutines, updatedRoutine, rooms);
    
    // Move the routine in state (don't save to database yet)
    setScheduledRoutines(prev => prev.map(sr => 
      sr.id === routine.id ? updatedRoutine : sr
    ));
    
    if (hasConflicts) {
      console.log('Routine moved with conflicts - conflicts will be shown in sidebar');
    }
    
    console.log('Routine moved (not saved yet)');
  }, [scheduledRoutines, checkConflicts, rooms]);

  const handleDeleteScheduledRoutine = useCallback((routine: ScheduledRoutine) => {
    console.log('Deleting scheduled routine:', routine.routine.songTitle);
    
    // Remove from scheduled routines (don't delete from database yet)
    setScheduledRoutines(prev => prev.filter(sr => sr.id !== routine.id));
    
    // Update routine's scheduled hours (temporary)
    setRoutines(prev => prev.map(r => 
      r.id === routine.routineId 
        ? { ...r, scheduledHours: Math.max(0, r.scheduledHours - (routine.duration / 60)) }
        : r
    ));
    
    console.log('Scheduled routine removed (not deleted from database yet)');
  }, []);

  const handleResolveConflicts = useCallback(() => {
    // User clicked "Schedule Anyway" - add the pending routine
    if (pendingScheduledRoutine && pendingRoutine) {
      console.log('Adding pending routine after conflict resolution');
      
      // Count how many times this routine is already scheduled
      const currentCount = scheduledRoutines.filter(sr => sr.routineId === pendingRoutine.id).length;
      const newCount = currentCount + 1;
      
      // Add to state (don't save to database yet)
      setScheduledRoutines(prev => {
        const updated = [...prev, pendingScheduledRoutine];
        return updated;
      });
      
      // Update routine's scheduled hours (temporary)
      setRoutines(prev => prev.map(r => 
        r.id === pendingRoutine.id 
          ? { ...r, scheduledHours: r.scheduledHours + (pendingRoutine.duration / 60) }
          : r
      ));
      
      // Show notification if routine has reached 6 scheduled times
      if (newCount === 6) {
        toast.success(`${pendingRoutine.songTitle} has been scheduled 6 times and is now maxed out.`, {
          duration: 4000,
          icon: '🔔',
        });
      }
      
      console.log('Pending routine added (not saved to database yet)');
      
      setPendingScheduledRoutine(null);
      setPendingRoutine(null);
      resolveConflicts(); // This already handles closing the modal
    }
  }, [scheduledRoutines, pendingScheduledRoutine, pendingRoutine, resolveConflicts]);

  // Save all schedule changes to database
  const handleSaveScheduleChanges = useCallback(async () => {
    try {
      // Find new routines (not in saved state)
      const newRoutines = scheduledRoutines.filter(curr => 
        !savedScheduledRoutines.some(saved => saved.id === curr.id)
      );

      // Find updated routines (exists in both but changed)
      const updatedRoutines = scheduledRoutines.filter(curr => {
        const saved = savedScheduledRoutines.find(s => s.id === curr.id);
        if (!saved) return false;
        return (
          saved.roomId !== curr.roomId ||
          saved.date !== curr.date ||
          saved.startTime.hour !== curr.startTime.hour ||
          saved.startTime.minute !== curr.startTime.minute ||
          saved.duration !== curr.duration
        );
      });

      // Find deleted routines (in saved but not in current)
      const deletedIds = savedScheduledRoutines
        .filter(saved => !scheduledRoutines.some(curr => curr.id === saved.id))
        .map(s => s.id);

      // Save all changes
      const savePromises: Promise<ScheduledRoutine | Response>[] = [];
      const savedNewRoutines: ScheduledRoutine[] = [];
      const savedUpdatedRoutines: ScheduledRoutine[] = [];

      // Create new routines
      for (const routine of newRoutines) {
        const startMinutes = routine.startTime.hour * 60 + routine.startTime.minute;
        const promise = fetch('/api/scheduled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: routine.date,
            startMinutes,
            duration: routine.duration,
            routineId: routine.routineId,
            roomId: routine.roomId,
          }),
        }).then(res => res.json()).then(saved => {
          // Map saved data to ScheduledRoutine format
          const startHour = Math.floor(saved.startMinutes / 60);
          const startMinute = saved.startMinutes % 60;
          const endMinutes = saved.startMinutes + saved.duration;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          const date = new Date(saved.date);
          
          const savedScheduledRoutine: ScheduledRoutine = {
            id: saved.id,
            routineId: saved.routineId,
            routine: saved.routine,
            roomId: saved.roomId,
            startTime: { hour: startHour, minute: startMinute, day: date.getDay() },
            endTime: { hour: endHour, minute: endMinute, day: date.getDay() },
            duration: saved.duration,
            date: date.toISOString().split('T')[0]
          };
          
          savedNewRoutines.push(savedScheduledRoutine);
          return savedScheduledRoutine;
        });
        savePromises.push(promise);
      }

      // Update existing routines
      for (const routine of updatedRoutines) {
        const startMinutes = routine.startTime.hour * 60 + routine.startTime.minute;
        const promise = fetch(`/api/scheduled/${routine.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: routine.date,
            startMinutes,
            duration: routine.duration,
            routineId: routine.routineId,
            roomId: routine.roomId,
          }),
        }).then(res => res.json()).then(saved => {
          // Map saved data to ScheduledRoutine format
          const startHour = Math.floor(saved.startMinutes / 60);
          const startMinute = saved.startMinutes % 60;
          const endMinutes = saved.startMinutes + saved.duration;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
          const date = new Date(saved.date);
          
          const savedScheduledRoutine: ScheduledRoutine = {
            id: saved.id,
            routineId: saved.routineId,
            routine: saved.routine,
            roomId: saved.roomId,
            startTime: { hour: startHour, minute: startMinute, day: date.getDay() },
            endTime: { hour: endHour, minute: endMinute, day: date.getDay() },
            duration: saved.duration,
            date: date.toISOString().split('T')[0]
          };
          
          savedUpdatedRoutines.push(savedScheduledRoutine);
          return savedScheduledRoutine;
        });
        savePromises.push(promise);
      }

      // Delete removed routines
      for (const id of deletedIds) {
        savePromises.push(
          fetch(`/api/scheduled/${id}`, {
            method: 'DELETE',
          })
        );
      }

      await Promise.all(savePromises);

      // Update scheduledRoutines with new/updated IDs
      const updatedScheduledRoutines = scheduledRoutines.map(curr => {
        // First check if this routine was newly created
        const matchingNew = savedNewRoutines.find(saved => {
          // Match by routine ID, room, date, and time (for new routines with temp IDs)
          return (curr.id.startsWith('scheduled-') || curr.id === saved.id) &&
                 curr.routineId === saved.routineId &&
                 curr.roomId === saved.roomId &&
                 curr.date === saved.date &&
                 curr.startTime.hour === saved.startTime.hour &&
                 curr.startTime.minute === saved.startTime.minute;
        });
        if (matchingNew) return matchingNew;
        
        // Check if this routine was updated
        const matchingUpdated = savedUpdatedRoutines.find(saved => saved.id === curr.id);
        if (matchingUpdated) return matchingUpdated;
        
        // Otherwise keep as is
        return curr;
      });

      // Update saved state with updated routines
      setScheduledRoutines(updatedScheduledRoutines);
      setSavedScheduledRoutines(updatedScheduledRoutines);
      setHasUnsavedChanges(false);

      toast.success('Schedule changes saved successfully');
    } catch (e: unknown) {
      console.error('Failed to save schedule changes:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to save schedule changes';
      toast.error(errorMessage);
    }
  }, [scheduledRoutines, savedScheduledRoutines]);
  
  const handleDismissConflicts = useCallback(() => {
    // User clicked "Cancel" - don't add the routine, just clear pending state
    console.log('Cancelling pending routine due to conflicts');
    setPendingScheduledRoutine(null);
    setPendingRoutine(null);
    dismissConflicts();
  }, [dismissConflicts]);

  const handleRoomConfigChange = useCallback((newVisibleRooms: number) => {
    setVisibleRooms(newVisibleRooms);
    setRooms(prev => prev.map((room, index) => ({
      ...room,
      isActive: index < newVisibleRooms
    })));
  }, []);

  const handleShowDancers = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved schedule changes. Are you sure you want to leave? Your changes will be lost.');
      if (!confirmed) return;
    }
    setShowDancersList(true);
  }, [hasUnsavedChanges]);

  const handleEmailSchedule = useCallback(() => {
    setShowEmailModal(true);
  }, []);

  const handleExportSchedule = useCallback(() => {
    // Generate week dates for the current week
    const currentWeek = new Date();
    const start = new Date(currentWeek);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    
    const weekDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      weekDates.push(day);
    }
    
    // Import and use the PDF generation utility
    import('./utils/pdfUtils').then(({ generateSchedulePDF }) => {
      generateSchedulePDF(scheduledRoutines, weekDates);
    });
  }, [scheduledRoutines]);

  const handleImportDancers = useCallback(async (importedDancers: Dancer[]) => {
    try {
      const res = await fetch('/api/dancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedDancers),
      });
      if (!res.ok) throw new Error('Failed to import dancers');
      const created = await res.json();
      setDancers(prev => [...prev, ...created]);
      toast.success(`Imported ${created.length} dancers`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to import dancers';
      toast.error(errorMessage);
    }
  }, []);

  const handleEditDancer = useCallback((dancer: Dancer) => {
    setSelectedDancer(dancer);
    setShowDancerEditModal(true);
  }, []);

  const handleSaveDancer = useCallback(async (updatedDancer: Dancer) => {
    try {
      // Update via API
      const res = await fetch(`/api/dancers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDancer),
      });
      if (!res.ok) throw new Error('Failed to update dancer');
      await res.json(); // Response confirmation
      
      setDancers(prev => prev.map(d => d.id === updatedDancer.id ? updatedDancer : d));
      
      // Also update dancer references in routines
      setRoutines(prev => prev.map(routine => ({
        ...routine,
        dancers: routine.dancers.map(d => d.id === updatedDancer.id ? updatedDancer : d)
      })));
      
      // Update scheduled routines that reference this dancer
      setScheduledRoutines(prev => prev.map(sr => {
        const updatedRoutine = sr.routine.dancers.some(d => d.id === updatedDancer.id)
          ? {
              ...sr.routine,
              dancers: sr.routine.dancers.map(d => d.id === updatedDancer.id ? updatedDancer : d)
            }
          : sr.routine;
        
        return {
          ...sr,
          routine: updatedRoutine
        };
      }));
      
      toast.success('Dancer updated successfully');
      setShowDancerEditModal(false);
      setSelectedDancer(null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to update dancer';
      toast.error(errorMessage);
    }
  }, []);

  const handleAddDancer = useCallback(async (newDancer: Dancer) => {
    try {
      const res = await fetch('/api/dancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDancer),
      });
      if (!res.ok) throw new Error('Failed to add dancer');
      const created = await res.json();
      const createdDancer = Array.isArray(created) ? created[0] : created;
      
      setDancers(prev => [...prev, createdDancer]);
      toast.success('Dancer added successfully');
      setShowDancerAddModal(false);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to add dancer';
      toast.error(errorMessage);
    }
  }, []);

  const handleDeleteDancer = useCallback(async (dancerId: string) => {
    try {
      const res = await fetch(`/api/dancers?id=${dancerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete dancer');
      
      // Remove dancer from state
      const deletedDancer = dancers.find(d => d.id === dancerId);
      setDancers(prev => prev.filter(d => d.id !== dancerId));
      
      // Remove dancer from routines (disconnect relationships)
      setRoutines(prev => prev.map(routine => ({
        ...routine,
        dancers: routine.dancers.filter(d => d.id !== dancerId)
      })));
      
      // Update scheduled routines that reference this dancer
      setScheduledRoutines(prev => prev.map(sr => {
        if (sr.routine.dancers.some(d => d.id === dancerId)) {
          return {
            ...sr,
            routine: {
              ...sr.routine,
              dancers: sr.routine.dancers.filter(d => d.id !== dancerId)
            }
          };
        }
        return sr;
      }));
      
      toast.success(`Dancer ${deletedDancer?.name || 'deleted'} removed successfully`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete dancer';
      toast.error(errorMessage);
    }
  }, [dancers]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 text-lg font-medium">Loading schedule data...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen bg-gray-100 flex overflow-hidden">
        {/* Left Sidebar - Routines */}
        <div className="flex-shrink-0">
          <RoutinesSidebar
            routines={routines}
            scheduledRoutines={scheduledRoutines}
            onRoutineClick={handleRoutineClick}
            onAddRoutine={handleAddRoutine}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showDancersList ? (
            <DancersList
              dancers={dancers}
              scheduledRoutines={scheduledRoutines}
              rooms={rooms}
              onClose={() => setShowDancersList(false)}
              onEditDancer={handleEditDancer}
              onDeleteDancer={handleDeleteDancer}
              onAddDancer={() => setShowDancerAddModal(true)}
              onImportCsv={() => setShowCsvImportModal(true)}
            />
              ) : (
                <CalendarGrid
                  rooms={rooms}
                  scheduledRoutines={scheduledRoutines}
                  onDrop={handleDropRoutine}
                  onRoutineClick={handleScheduledRoutineClick}
                  onMoveRoutine={handleMoveRoutine}
                  onDeleteRoutine={handleDeleteScheduledRoutine}
                  visibleRooms={visibleRooms}
                  hasUnsavedChanges={hasUnsavedChanges}
                  onSaveChanges={handleSaveScheduleChanges}
                />
              )}
        </div>

        {/* Right Sidebar - Tools */}
        <div className="flex-shrink-0">
          <ToolsSidebar
            rooms={rooms}
            dancers={dancers}
            visibleRooms={visibleRooms}
            onRoomConfigChange={handleRoomConfigChange}
                onEmailSchedule={handleEmailSchedule}
                onExportSchedule={handleExportSchedule}
                onShowDancers={handleShowDancers}
                conflicts={getConflictsForDisplay()}
          />
        </div>

        {/* Modals */}
        <RoutineDetailsModal
          routine={selectedRoutine}
          dancers={dancers}
          teachers={mockTeachers}
          genres={mockGenres}
          isOpen={showRoutineModal}
          onClose={() => {
            setShowRoutineModal(false);
            setSelectedRoutine(null);
          }}
          onSave={handleSaveRoutine}
          onDelete={handleDeleteRoutine}
        />

        <ConflictWarningModal
          conflicts={conflicts}
          isOpen={showConflictModal}
          onResolve={handleResolveConflicts}
          onDismiss={handleDismissConflicts}
        />

        <EmailScheduleModal
          dancers={dancers}
          scheduledRoutines={scheduledRoutines}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />

        <ScheduledDancersModal
          scheduledRoutine={selectedScheduledRoutine}
          isOpen={showScheduledDancersModal}
          onClose={() => {
            setShowScheduledDancersModal(false);
            setSelectedScheduledRoutine(null);
          }}
        />

        <CsvImportModal
          isOpen={showCsvImportModal}
          onClose={() => setShowCsvImportModal(false)}
          onImport={handleImportDancers}
        />

        <DancerEditModal
          dancer={selectedDancer}
          isOpen={showDancerEditModal}
          onClose={() => {
            setShowDancerEditModal(false);
            setSelectedDancer(null);
          }}
          onSave={handleSaveDancer}
        />

        <DancerAddModal
          isOpen={showDancerAddModal}
          onClose={() => setShowDancerAddModal(false)}
          onSave={handleAddDancer}
        />

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </DndProvider>
  );
}