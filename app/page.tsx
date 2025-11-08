'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
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
import { RoutineAddModal } from './components/modals/RoutineAddModal';
import { ConflictWarningModal } from './components/modals/ConflictWarningModal';
import { EmailScheduleModal } from './components/modals/EmailScheduleModal';
import { ScheduledDancersModal } from './components/modals/ScheduledDancersModal';
import { CsvImportModal } from './components/modals/CsvImportModal';
import { DancerEditModal } from './components/modals/DancerEditModal';
import { DancerAddModal } from './components/modals/DancerAddModal';
import { ExportScheduleModal } from './components/modals/ExportScheduleModal';
import { ScheduleOptionsModal } from './components/modals/ScheduleOptionsModal';
import { LoadingOverlay } from './components/common/LoadingOverlay';

// Types
import { Routine, Teacher, Genre } from './types/routine';
import { ScheduledRoutine, Room } from './types/schedule';
import { Dancer } from './types/dancer';

// Data
import { mockTeachers, mockGenres } from './data/mockRoutines';
import { Level } from './types/routine';
import { mockRooms } from './data/mockSchedules';

// Hooks
import { useConflictDetection } from './hooks/useConflictDetection';

// Utils
import { addMinutesToTime, formatTime } from './utils/timeUtils';
import { getRoomOverlaps } from './utils/conflictUtils';

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
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isTogglingInactive, setIsTogglingInactive] = useState(false);
  
  // Modal states
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showRoutineAddModal, setShowRoutineAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedScheduledRoutine, setSelectedScheduledRoutine] = useState<ScheduledRoutine | null>(null);
  const [showScheduledDancersModal, setShowScheduledDancersModal] = useState(false);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDancer, setSelectedDancer] = useState<Dancer | null>(null);
  const [showDancerEditModal, setShowDancerEditModal] = useState(false);
  const [showDancerAddModal, setShowDancerAddModal] = useState(false);
  const [showScheduleOptionsModal, setShowScheduleOptionsModal] = useState(false);
  const [pendingScheduleRoutine, setPendingScheduleRoutine] = useState<Routine | null>(null);
  const [pendingScheduleTimeSlot, setPendingScheduleTimeSlot] = useState<{ hour: number; minute: number; day: number; roomId: string; date: string } | null>(null);
  
  // Load teachers, genres, and levels
  const [teachers, setTeachers] = useState(Array.from(mockTeachers));
  const [genres, setGenres] = useState(Array.from(mockGenres));
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);

  useEffect(() => {
    const loadMetaData = async () => {
      try {
        const [tRes, gRes, lRes] = await Promise.all([
          fetch('/api/teachers'),
          fetch('/api/genres'),
          fetch('/api/levels')
        ]);
        const [tData, gData, lData] = await Promise.all([
          tRes.json(),
          gRes.json(),
          lRes.json()
        ]);
        setTeachers(tData);
        setGenres(gData);
        setLevels(lData);
      } catch (e) {
        console.error('Failed to load metadata', e);
      }
    };
    loadMetaData();
  }, []);

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
        // Ensure all routines have scheduledHours set (default to 0 if missing)
        const routinesWithHours = routinesJson.map((r: Routine) => ({
          ...r,
          scheduledHours: r.scheduledHours ?? 0
        }));
        setRoutines(routinesWithHours);
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
          // Format date using UTC components to ensure consistent calendar date
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          // Use UTC components for day of week to avoid timezone shift
          const dayOfWeek = date.getUTCDay();
          
          return {
            id: it.id,
            routineId: it.routineId,
            routine: it.routine,
            roomId: it.roomId,
            startTime: { hour: startHour, minute: startMinute, day: dayOfWeek },
            endTime: { hour: endHour, minute: endMinute, day: dayOfWeek },
            duration: it.duration,
            date: dateString
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
  // Pending duration change when conflicts are detected during extension
  const [pendingDurationChange, setPendingDurationChange] = useState<{ id: string; newDuration: number } | null>(null);
  
  // Conflict detection
  const { conflicts, showConflictModal, checkConflicts, resolveConflicts, dismissConflicts } = useConflictDetection();

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
    const defaultLevel = levels.length > 0 ? levels[0] : undefined;
    const newRoutine: Routine = {
      id: `routine-${Date.now()}`,
      songTitle: 'New Routine',
      dancers: [],
      teacher: teachers.length > 0 ? teachers[0] : mockTeachers[0],
      genre: genres.length > 0 ? genres[0] : mockGenres[0],
      level: defaultLevel,
      duration: 60,
      notes: '',
      scheduledHours: 0,
      color: defaultLevel?.color || '#3b82f6'
    };
    setSelectedRoutine(newRoutine);
    setShowRoutineAddModal(true);
  }, [teachers, genres, levels]);

  const handleSaveRoutine = useCallback(async (updatedRoutine: Routine) => {
    setIsSavingRoutine(true);
    try {
      // Extract dancer IDs
      const dancerIds = updatedRoutine.dancers?.map(d => d.id) || [];
      
      // Determine if this is a new routine by checking if it exists in the routines state
      // Seed routines have IDs like "routine-1", "routine-2" etc. which are actual database IDs
      // New temporary routines have IDs like "routine-{timestamp}" and are NOT in the state yet
      // Database-generated IDs are CUIDs (like "cmhgrbtoq000luu60mwfnd4jo")
      // If the routine exists in state by ID, it's an UPDATE, not a new routine
      const routineExistsInState = routines.some(r => r.id === updatedRoutine.id);
      const isNewRoutine = !routineExistsInState;
      
      console.log('Saving routine:', {
        id: updatedRoutine.id,
        routineExistsInState,
        isNewRoutine,
        songTitle: updatedRoutine.songTitle
      });
      
      // Save to database
      const res = await fetch('/api/routines', {
        method: isNewRoutine ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isNewRoutine ? {} : { id: updatedRoutine.id }),
          songTitle: updatedRoutine.songTitle,
          duration: updatedRoutine.duration,
          notes: updatedRoutine.notes,
          levelId: updatedRoutine.level?.id || null,
          color: updatedRoutine.color,
          teacherId: updatedRoutine.teacher.id,
          genreId: updatedRoutine.genre.id,
          dancerIds: dancerIds,
          isInactive: updatedRoutine.isInactive || false,
        }),
      });
      
      if (!res.ok) {
        let errorMessage = 'Failed to save routine';
        const contentType = res.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = 'Failed to save routine';
          }
        } else {
          try {
            const errorText = await res.text();
            errorMessage = errorText || errorMessage;
          } catch {
            errorMessage = 'Failed to save routine';
          }
        }
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }
      const saved = await res.json();
      
      console.log('Saved routine from API:', {
        id: saved.id,
        songTitle: saved.songTitle,
        originalId: updatedRoutine.id,
        isNewRoutine
      });
      
      // Update both routines and scheduledRoutines together
      // Get current state to check for existing routine and preserve scheduledHours
      setRoutines(prev => {
        if (isNewRoutine) {
          // For new routines: remove temp routine (if it exists) and add saved one with scheduledHours set to 0
          // Also check if saved.id already exists to avoid duplicates
          const filtered = prev.filter(r => r.id !== updatedRoutine.id && r.id !== saved.id);
          
          console.log('[NEW] Adding new routine:', {
            savedId: saved.id,
            filteredCount: filtered.length,
            prevCount: prev.length
          });
          
          return [...filtered, { ...saved, scheduledHours: 0 }];
        }
        
        // For updates: find and update existing routine
        // Check if routine exists by saved.id (the real database ID) or original updated id
        const existingRoutine = prev.find(r => 
          r.id === saved.id || r.id === updatedRoutine.id
        );
        
        if (!existingRoutine) {
          // If routine not found by saved.id or original id, check if it exists with saved.id
          const foundBySavedId = prev.find(r => r.id === saved.id);
          if (foundBySavedId) {
            // Update the existing routine found by saved.id
            console.log(`[UPDATE] Updating routine ${saved.id} found by saved ID, preserving scheduledHours: ${foundBySavedId.scheduledHours}`);
            return prev.map(r => {
              if (r.id === saved.id) {
                return { 
                  ...saved, 
                  scheduledHours: r.scheduledHours || 0 
                };
              }
              return r;
            });
          }
          
          console.error(`[UPDATE] Routine with id ${saved.id} not found in state. Original ID: ${updatedRoutine.id}`);
          console.error('Current routine IDs:', prev.map(r => ({ id: r.id, songTitle: r.songTitle })));
          // CRITICAL: Don't add duplicate - return current state unchanged
          // If we can't find the routine, something is wrong with the state
          return prev;
        }
        
        // Update the existing routine in place, preserving scheduledHours
        console.log(`[UPDATE] Updating routine ${saved.id}, preserving scheduledHours: ${existingRoutine.scheduledHours}`);
        
        // Use map to update in place - ensure we update by both saved.id and original id
        return prev.map(r => {
          // Update if it matches either the saved ID or the original updated ID
          if (r.id === saved.id || r.id === updatedRoutine.id) {
            return { 
              ...saved, 
              scheduledHours: r.scheduledHours || 0 
            };
          }
          return r;
        });
      });
      
      // Also update all scheduled routines that reference this routine
      // Need to get the updated routine with preserved scheduledHours
      setScheduledRoutines(prev => {
        // Get the updated routine's scheduledHours by checking routines state after update
        return prev.map(sr => {
        if (sr.routineId === saved.id) {
          // Update the routine data and recalculate endTime if duration changed
          const newDuration = saved.duration;
          const startMinutes = sr.startTime.hour * 60 + sr.startTime.minute;
          const endMinutes = startMinutes + newDuration;
          const endHour = Math.floor(endMinutes / 60);
          const endMinute = endMinutes % 60;
            
            // Use scheduledHours from the existing scheduled routine (preserves actual value)
            const scheduledHours = sr.routine?.scheduledHours || 0;
            const routineWithHours = { 
              ...saved, 
              scheduledHours: scheduledHours
            };
          
          return { 
            ...sr, 
              routine: routineWithHours, 
            duration: newDuration,
            endTime: { hour: endHour, minute: endMinute, day: sr.startTime.day }
          };
        }
        return sr;
        });
      });
      
      toast.success('Routine saved successfully');
      setShowRoutineModal(false);
      setShowRoutineAddModal(false);
      setSelectedRoutine(null);
    } catch (e: unknown) {
      console.error('Failed to save routine:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to save routine';
      toast.error(errorMessage);
    } finally {
      setIsSavingRoutine(false);
    }
  }, [routines]);

  const handleDeleteRoutine = useCallback(async (routineId: string) => {
    try {
      const res = await fetch(`/api/routines/${routineId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete routine');
      
      // Update frontend state only after successful API call
      setRoutines(prev => prev.filter(r => r.id !== routineId));
      setScheduledRoutines(prev => prev.filter(sr => sr.routineId !== routineId));
      setShowRoutineModal(false);
      setSelectedRoutine(null);
      
      toast.success('Routine deleted successfully');
    } catch (e: unknown) {
      console.error('Failed to delete routine:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete routine';
      toast.error(errorMessage);
    }
  }, []);

  const handleToggleRoutineInactive = useCallback(async (routine: Routine) => {
    setIsTogglingInactive(true);
    try {
      const newInactiveStatus = !routine.isInactive;
      const res = await fetch(`/api/routines/${routine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInactive: newInactiveStatus }),
      });
      
      if (!res.ok) throw new Error('Failed to toggle inactive status');
      const updated = await res.json();
      
      // Update the routine in the routines array
      setRoutines(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
      
      // Also update scheduled routines if needed
      setScheduledRoutines(prev => prev.map(sr => {
        if (sr.routineId === updated.id) {
          return { ...sr, routine: { ...sr.routine, ...updated } };
        }
        return sr;
      }));
      
      toast.success(newInactiveStatus ? 'Routine marked as inactive' : 'Routine marked as active');
    } catch (e: unknown) {
      console.error('Failed to toggle inactive status:', e);
      const errorMessage = e instanceof Error ? e.message : 'Failed to toggle inactive status';
      toast.error(errorMessage);
    } finally {
      setIsTogglingInactive(false);
    }
  }, []);

  const handleDropRoutine = useCallback((routine: Routine, timeSlot: { hour: number; minute: number; day: number; roomId: string; date: string }) => {
    console.log('handleDropRoutine called:', { routine: routine.songTitle, timeSlot });
    
    // Store the routine and time slot for the modal
    setPendingScheduleRoutine(routine);
    setPendingScheduleTimeSlot(timeSlot);
    setShowScheduleOptionsModal(true);
  }, []);

  const handleConfirmSchedule = useCallback((options: { isRecurring: boolean; weeks: number; endDate?: string }) => {
    if (!pendingScheduleRoutine || !pendingScheduleTimeSlot) {
      return;
    }

    const routine = pendingScheduleRoutine;
    const timeSlot = pendingScheduleTimeSlot;
    const { isRecurring, weeks, endDate } = options;

    // Calculate all scheduled routines to create
    const scheduledRoutinesToCreate: ScheduledRoutine[] = [];
    
    if (isRecurring) {
      // Generate recurring schedules
      const startDate = new Date(timeSlot.date);
      const endDateObj = endDate ? new Date(endDate) : null;
      
      // Calculate how many weeks to create
      let weeksToCreate = weeks;
      if (endDateObj) {
        const diffTime = endDateObj.getTime() - startDate.getTime();
        const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
        weeksToCreate = Math.max(weeks, diffWeeks);
      }

      // Create one scheduled routine per week
      const baseTimestamp = Date.now();
      for (let week = 0; week < weeksToCreate; week++) {
        const scheduleDate = new Date(startDate);
        scheduleDate.setDate(scheduleDate.getDate() + (week * 7));
        
        // If endDate is specified, stop if we exceed it
        if (endDateObj && scheduleDate > endDateObj) {
          break;
        }

        const scheduleDateStr = scheduleDate.toISOString().split('T')[0];
        const dayOfWeek = scheduleDate.getDay();

        scheduledRoutinesToCreate.push({
          id: `scheduled-${baseTimestamp}-${week}-${Math.random().toString(36).substring(2, 11)}`,
          routineId: routine.id,
          routine: routine,
          roomId: timeSlot.roomId,
          startTime: { hour: timeSlot.hour, minute: timeSlot.minute, day: dayOfWeek },
          endTime: addMinutesToTime({ hour: timeSlot.hour, minute: timeSlot.minute, day: dayOfWeek }, routine.duration),
          duration: routine.duration,
          date: scheduleDateStr
        });
      }
    } else {
      // Single schedule
      const newScheduledRoutine: ScheduledRoutine = {
        id: `scheduled-${Date.now()}`,
        routineId: routine.id,
        routine: routine,
        roomId: timeSlot.roomId,
        startTime: { hour: timeSlot.hour, minute: timeSlot.minute, day: timeSlot.day },
        endTime: addMinutesToTime({ hour: timeSlot.hour, minute: timeSlot.minute, day: timeSlot.day }, routine.duration),
        duration: routine.duration,
        date: timeSlot.date
      };
      scheduledRoutinesToCreate.push(newScheduledRoutine);
    }

    // Validate all schedules before adding
    const conflicts: string[] = [];
    
    for (const newScheduledRoutine of scheduledRoutinesToCreate) {
      // Check if the same routine is already scheduled at this exact time slot
      const sameRoutineAtSlot = scheduledRoutines.find(sr => {
        return sr.routineId === routine.id &&
               sr.roomId === newScheduledRoutine.roomId &&
               sr.date === newScheduledRoutine.date &&
               sr.startTime.hour === newScheduledRoutine.startTime.hour &&
               sr.startTime.minute === newScheduledRoutine.startTime.minute;
      });
      
      if (sameRoutineAtSlot) {
        const roomName = rooms.find(r => r.id === newScheduledRoutine.roomId)?.name || 'Studio';
        const conflictTime = formatTime(newScheduledRoutine.startTime.hour, newScheduledRoutine.startTime.minute);
        conflicts.push(`"${routine.songTitle}" is already scheduled at ${roomName} on ${new Date(newScheduledRoutine.date).toLocaleDateString()} at ${conflictTime}.`);
        continue;
      }

      // Strict room overlap detection
      const roomOverlaps = getRoomOverlaps(scheduledRoutines, newScheduledRoutine);
      if (roomOverlaps.length > 0) {
        const roomName = rooms.find(r => r.id === newScheduledRoutine.roomId)?.name || 'Studio';
        const first = roomOverlaps[0];
        const conflictTime = formatTime(first.startTime.hour, first.startTime.minute);
        conflicts.push(`${roomName} already has "${first.routine.songTitle}" scheduled on ${new Date(newScheduledRoutine.date).toLocaleDateString()} at ${conflictTime}.`);
        continue;
      }

      // Check for dancer conflicts
      const hasConflicts = checkConflicts(scheduledRoutines, newScheduledRoutine, rooms);
      
      if (hasConflicts) {
        // For recurring schedules with conflicts, we'll store the first one as pending
        // and let the conflict modal handle it
        console.log('Conflicts detected - storing routine as pending');
        setPendingScheduledRoutine(newScheduledRoutine);
        setPendingRoutine(routine);
        setShowScheduleOptionsModal(false);
        setPendingScheduleRoutine(null);
        setPendingScheduleTimeSlot(null);
        return;
      }
    }

    // If there are room/routine conflicts, show error
    if (conflicts.length > 0) {
      toast.error(conflicts[0]);
      setShowScheduleOptionsModal(false);
      setPendingScheduleRoutine(null);
      setPendingScheduleTimeSlot(null);
      return;
    }

    // No conflicts, add all schedules
    console.log(`Adding ${scheduledRoutinesToCreate.length} scheduled routine(s) to schedule`);
    
    // Count how many times this routine is already scheduled
    const currentCount = scheduledRoutines.filter(sr => sr.routineId === routine.id).length;
    const newCount = currentCount + scheduledRoutinesToCreate.length;
    
    // Add all to state (don't save to database yet)
    setScheduledRoutines(prev => {
      const updated = [...prev, ...scheduledRoutinesToCreate];
      console.log('Updated scheduled routines:', updated.length);
      return updated;
    });
    
    // Update routine's scheduled hours (temporary)
    const totalHours = scheduledRoutinesToCreate.length * (routine.duration / 60);
    setRoutines(prev => prev.map(r => 
      r.id === routine.id 
        ? { ...r, scheduledHours: r.scheduledHours + totalHours }
        : r
    ));
    
    // Show notification
    if (isRecurring) {
      toast.success(`${routine.songTitle} scheduled recurring for ${scheduledRoutinesToCreate.length} week(s).`, {
        duration: 4000,
      });
    } else {
      // Show notification if routine has reached 6 scheduled times
      if (newCount === 6) {
        toast.success(`${routine.songTitle} has been scheduled 6 times and is now maxed out.`, {
          duration: 4000,
          icon: '🔔',
        });
      }
    }
    
    // Close modal and clear pending state
    setShowScheduleOptionsModal(false);
    setPendingScheduleRoutine(null);
    setPendingScheduleTimeSlot(null);
    setHasUnsavedChanges(true);
  }, [pendingScheduleRoutine, pendingScheduleTimeSlot, scheduledRoutines, rooms, checkConflicts]);

  const handleCancelSchedule = useCallback(() => {
    setShowScheduleOptionsModal(false);
    setPendingScheduleRoutine(null);
    setPendingScheduleTimeSlot(null);
  }, []);

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

    // Strict room overlap detection (excluding self)
    const roomOverlaps = getRoomOverlaps(otherRoutines, updatedRoutine);
    if (roomOverlaps.length > 0) {
      const roomName = rooms.find(r => r.id === newTimeSlot.roomId)?.name || 'Studio';
      const first = roomOverlaps[0];
      const conflictTime = formatTime(first.startTime.hour, first.startTime.minute);
      toast.error(`${roomName} already has "${first.routine.songTitle}" scheduled at ${conflictTime}. Only one routine can be scheduled per studio at a time.`);
      console.log('Room conflict detected - cannot move routine');
      return;
    }

    // Check for dancer conflicts (also triggers modal state via hook)
    const hasConflicts = checkConflicts(otherRoutines, updatedRoutine, rooms);
    
    if (hasConflicts) {
      // Don't apply move yet; store as pending and wait for user decision via modal
      setPendingScheduledRoutine(updatedRoutine);
      setPendingRoutine(routine.routine);
      console.log('Move has conflicts - awaiting user decision');
      return;
    }

    // No conflicts: apply move
    setScheduledRoutines(prev => prev.map(sr => sr.id === routine.id ? updatedRoutine : sr));
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

  // Update duration for a scheduled rehearsal
  const handleUpdateScheduledRoutineDuration = useCallback((id: string, newDuration: number) => {
    if (!Number.isFinite(newDuration) || newDuration < 1) {
      toast.error('Duration must be at least 1 minute');
      return;
    }

    const current = scheduledRoutines.find(sr => sr.id === id);
    if (!current) return;

    const updated: ScheduledRoutine = {
      ...current,
      duration: newDuration,
      endTime: addMinutesToTime(current.startTime, newDuration),
    };

    // Exclude current from conflict checks
    const others = scheduledRoutines.filter(sr => sr.id !== id);

    // Room conflict check (all overlaps) - still show toast error for room conflicts
    const roomOverlaps = getRoomOverlaps(others, updated);
    if (roomOverlaps.length > 0) {
      const roomName = rooms.find(r => r.id === updated.roomId)?.name || 'Studio';
      const first = roomOverlaps[0];
      const conflictTime = formatTime(first.startTime.hour, first.startTime.minute);
      toast.error(`${roomName} already has "${first.routine.songTitle}" scheduled at ${conflictTime}.`);
      return;
    }

    // Dancer conflicts - show modal instead of toast error
    const hasConflicts = checkConflicts(others, updated, rooms);
    if (hasConflicts) {
      // Store pending duration change and show conflict modal
      setPendingDurationChange({ id, newDuration });
      console.log('Duration change has conflicts - awaiting user decision');
      return;
    }

    // No conflicts: apply update
    setScheduledRoutines(prev => prev.map(sr => sr.id === id ? updated : sr));
    // Keep modal selection in sync
    setSelectedScheduledRoutine(prev => prev && prev.id === id ? updated : prev);

    toast.success('Rehearsal duration updated');
  }, [scheduledRoutines, rooms, checkConflicts]);

  const handleResolveConflicts = useCallback(() => {
    // User clicked "Schedule Anyway" - handle pending routine or duration change
    if (pendingDurationChange) {
      // Apply pending duration change
      const { id, newDuration } = pendingDurationChange;
      const current = scheduledRoutines.find(sr => sr.id === id);
      if (current) {
        const updated: ScheduledRoutine = {
          ...current,
          duration: newDuration,
          endTime: addMinutesToTime(current.startTime, newDuration),
        };
        
        setScheduledRoutines(prev => prev.map(sr => sr.id === id ? updated : sr));
        // Keep modal selection in sync
        setSelectedScheduledRoutine(prev => prev && prev.id === id ? updated : prev);
        
        toast.success('Rehearsal duration updated');
        console.log('Duration change applied after conflict resolution');
      }
      
      setPendingDurationChange(null);
      resolveConflicts(); // This already handles closing the modal
      return;
    }
    
    if (pendingScheduledRoutine && pendingRoutine) {
      console.log('Adding pending routine after conflict resolution');
      
      // Count how many times this routine is already scheduled
      const currentCount = scheduledRoutines.filter(sr => sr.routineId === pendingRoutine.id).length;
      const newCount = currentCount + 1;
      
      // Apply pending: if it's an existing routine being moved, replace; else add
      setScheduledRoutines(prev => {
        const existsIndex = prev.findIndex(sr => sr.id === pendingScheduledRoutine.id);
        if (existsIndex !== -1) {
          const copy = [...prev];
          copy[existsIndex] = pendingScheduledRoutine;
          return copy;
        }
        return [...prev, pendingScheduledRoutine];
      });
      
      // Update routine's scheduled hours (temporary) only if it was a new add (not a move)
      const wasNew = !scheduledRoutines.some(sr => sr.id === pendingScheduledRoutine.id);
      if (wasNew) {
      setRoutines(prev => prev.map(r => 
        r.id === pendingRoutine.id 
          ? { ...r, scheduledHours: r.scheduledHours + (pendingRoutine.duration / 60) }
          : r
      ));
      }
      
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
  }, [scheduledRoutines, pendingScheduledRoutine, pendingRoutine, pendingDurationChange, resolveConflicts]);

  // Save all schedule changes to database
  const handleSaveScheduleChanges = useCallback(async () => {
    setIsSavingSchedule(true);
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
          // Format date using UTC components to ensure consistent calendar date
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          // Use UTC components for day of week to avoid timezone shift
          const dayOfWeek = date.getUTCDay();
          
          const savedScheduledRoutine: ScheduledRoutine = {
            id: saved.id,
            routineId: saved.routineId,
            routine: saved.routine,
            roomId: saved.roomId,
            startTime: { hour: startHour, minute: startMinute, day: dayOfWeek },
            endTime: { hour: endHour, minute: endMinute, day: dayOfWeek },
            duration: saved.duration,
            date: dateString
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
          // Format date using UTC components to ensure consistent calendar date
          const year = date.getUTCFullYear();
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const dateString = `${year}-${month}-${day}`;
          // Use UTC components for day of week to avoid timezone shift
          const dayOfWeek = date.getUTCDay();
          
          const savedScheduledRoutine: ScheduledRoutine = {
            id: saved.id,
            routineId: saved.routineId,
            routine: saved.routine,
            roomId: saved.roomId,
            startTime: { hour: startHour, minute: startMinute, day: dayOfWeek },
            endTime: { hour: endHour, minute: endMinute, day: dayOfWeek },
            duration: saved.duration,
            date: dateString
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
    } finally {
      setIsSavingSchedule(false);
    }
  }, [scheduledRoutines, savedScheduledRoutines]);
  
  const handleDismissConflicts = useCallback(() => {
    // User clicked "Cancel" - don't apply the change, just clear pending state
    if (pendingDurationChange) {
      console.log('Cancelling pending duration change due to conflicts');
      setPendingDurationChange(null);
    } else {
      console.log('Cancelling pending routine due to conflicts');
      setPendingScheduledRoutine(null);
      setPendingRoutine(null);
    }
    dismissConflicts();
  }, [dismissConflicts, pendingDurationChange]);

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
    setShowExportModal(true);
  }, []);

  const handleConfirmExport = useCallback((from: string, to: string, levelIds: string[] = []) => {
    // Build inclusive date range array
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const dates: Date[] = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    
    // Filter scheduled routines by date range (based on sr.date which is YYYY-MM-DD)
    let filtered = scheduledRoutines.filter(sr => sr.date >= from && sr.date <= to);

    // Filter by level if selected
    if (levelIds.length > 0) {
      filtered = filtered.filter(sr => {
        if (!sr.routine?.level || !sr.routine.level.id) return false;
        return levelIds.includes(sr.routine.level.id);
      });
    }

    import('./utils/pdfUtils').then(({ generateSchedulePDF }) => {
      generateSchedulePDF(filtered, dates, rooms);
    });
    setShowExportModal(false);
  }, [scheduledRoutines, rooms]);

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

  const handleBatchDeleteDancers = useCallback(async (dancerIds: string[]) => {
    if (!Array.isArray(dancerIds) || dancerIds.length === 0) return;
    try {
      const idsParam = encodeURIComponent(dancerIds.join(','));
      const res = await fetch(`/api/dancers?ids=${idsParam}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete selected dancers');

      const deletedNames = dancers
        .filter(d => dancerIds.includes(d.id))
        .map(d => d.name);

      // Remove dancers from state
      setDancers(prev => prev.filter(d => !dancerIds.includes(d.id)));

      // Remove dancers from routines
      setRoutines(prev => prev.map(routine => ({
        ...routine,
        dancers: routine.dancers.filter(d => !dancerIds.includes(d.id))
      })));

      // Update scheduled routines that reference these dancers
      setScheduledRoutines(prev => prev.map(sr => {
        const hasAny = sr.routine.dancers.some(d => dancerIds.includes(d.id));
        if (!hasAny) return sr;
        return {
          ...sr,
          routine: {
            ...sr.routine,
            dancers: sr.routine.dancers.filter(d => !dancerIds.includes(d.id))
          }
        };
      }));

      toast.success(`Deleted ${dancerIds.length} dancer(s)` + (deletedNames.length ? `: ${deletedNames.join(', ')}` : ''));
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to delete selected dancers';
      toast.error(errorMessage);
    }
  }, [dancers]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/RehearsalHub.webp"
            alt="RehearsalHub Logo"
            width={300}
            height={120}
            className="object-contain"
            priority
          />
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-gray-600 text-lg font-medium">Loading schedule data...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen bg-gray-100 flex overflow-hidden">
        {(isSavingRoutine || isSavingSchedule || isTogglingInactive) && (
          <LoadingOverlay 
            message={
              isSavingRoutine 
                ? 'Saving routine...' 
                : isSavingSchedule 
                ? 'Saving schedule...' 
                : 'Updating routine status...'
            } 
          />
        )}
        {/* Left Sidebar - Routines */}
        <div className="flex-shrink-0">
          <RoutinesSidebar
            routines={routines}
            scheduledRoutines={scheduledRoutines}
            onRoutineClick={handleRoutineClick}
            onAddRoutine={handleAddRoutine}
            onToggleInactive={handleToggleRoutineInactive}
            onTeachersChange={(updatedTeachers) => {
              setTeachers(updatedTeachers as Teacher[]);
              // Reload routines to reflect teacher changes
              fetch('/api/routines')
                .then(res => res.json())
                .then(data => setRoutines(data))
                .catch(console.error);
            }}
            onGenresChange={(updatedGenres) => {
              setGenres(updatedGenres as Genre[]);
              // Reload routines to reflect genre changes
              fetch('/api/routines')
                .then(res => res.json())
                .then(data => setRoutines(data))
                .catch(console.error);
            }}
            onLevelsChange={(updatedLevels) => {
              setLevels(updatedLevels as Level[]);
              // Reload routines to reflect level changes
              fetch('/api/routines')
                .then(res => res.json())
                .then(data => setRoutines(data))
                .catch(console.error);
            }}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showDancersList ? (
            <DancersList
              dancers={dancers}
              scheduledRoutines={scheduledRoutines}
              allRoutines={routines}
              rooms={rooms}
              onClose={() => setShowDancersList(false)}
              onEditDancer={handleEditDancer}
              onDeleteDancer={handleDeleteDancer}
              onBatchDeleteDancers={handleBatchDeleteDancers}
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
                  onResizeRoutineDuration={(routine, minutes) => handleUpdateScheduledRoutineDuration(routine.id, minutes)}
                  levels={levels}
                  selectedLevelIds={selectedLevelIds}
                  onLevelIdsChange={setSelectedLevelIds}
                />
              )}
        </div>

        {/* Right Sidebar - Tools */}
        <div className="flex-shrink-0">
          <ToolsSidebar
            rooms={rooms}
            dancers={dancers}
            scheduledRoutines={scheduledRoutines}
            visibleRooms={visibleRooms}
            onRoomConfigChange={handleRoomConfigChange}
                onEmailSchedule={handleEmailSchedule}
                onExportSchedule={handleExportSchedule}
                onShowDancers={handleShowDancers}
          />
        </div>

        {/* Modals */}
        <RoutineAddModal
          routine={selectedRoutine}
          dancers={dancers}
          teachers={teachers}
          genres={genres}
          levels={levels}
          isOpen={showRoutineAddModal}
          saving={isSavingRoutine}
          onClose={() => {
            setShowRoutineAddModal(false);
            setSelectedRoutine(null);
          }}
          onSave={handleSaveRoutine}
          onTeachersChange={(updatedTeachers) => {
            setTeachers(updatedTeachers);
            // Reload routines to reflect teacher changes
            fetch('/api/routines')
              .then(res => res.json())
              .then(data => setRoutines(data))
              .catch(console.error);
          }}
          onGenresChange={(updatedGenres) => {
            setGenres(updatedGenres);
            // Reload routines to reflect genre changes
            fetch('/api/routines')
              .then(res => res.json())
              .then(data => setRoutines(data))
              .catch(console.error);
          }}
          onLevelsChange={(updatedLevels) => {
            setLevels(updatedLevels);
            // Reload routines to reflect level changes
            fetch('/api/routines')
              .then(res => res.json())
              .then(data => setRoutines(data))
              .catch(console.error);
          }}
        />

        <RoutineDetailsModal
          routine={selectedRoutine}
          dancers={dancers}
          teachers={teachers}
          genres={genres}
          levels={levels}
          isOpen={showRoutineModal}
          saving={isSavingRoutine}
          onClose={() => {
            setShowRoutineModal(false);
            setSelectedRoutine(null);
          }}
          onSave={handleSaveRoutine}
          onDelete={handleDeleteRoutine}
          onTeachersChange={(updatedTeachers) => {
            setTeachers(updatedTeachers);
            // Reload routines to reflect teacher changes
            fetch('/api/routines')
              .then(res => res.json())
              .then(data => setRoutines(data))
              .catch(console.error);
          }}
          onGenresChange={(updatedGenres) => {
            setGenres(updatedGenres);
            // Reload routines to reflect genre changes
            fetch('/api/routines')
              .then(res => res.json())
              .then(data => setRoutines(data))
              .catch(console.error);
          }}
          onLevelsChange={(updatedLevels) => {
            setLevels(updatedLevels);
            // Reload routines to reflect level changes
            fetch('/api/routines')
              .then(res => res.json())
              .then(data => setRoutines(data))
              .catch(console.error);
          }}
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
          allRoutines={routines}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />

        <ExportScheduleModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleConfirmExport}
        />

        {pendingScheduleRoutine && pendingScheduleTimeSlot && (
          <ScheduleOptionsModal
            routine={pendingScheduleRoutine}
            timeSlot={pendingScheduleTimeSlot}
            roomName={rooms.find(r => r.id === pendingScheduleTimeSlot.roomId)?.name || 'Studio'}
            isOpen={showScheduleOptionsModal}
            onConfirm={handleConfirmSchedule}
            onCancel={handleCancelSchedule}
          />
        )}

        <ScheduledDancersModal
          scheduledRoutine={selectedScheduledRoutine}
          isOpen={showScheduledDancersModal}
          onClose={() => {
            setShowScheduledDancersModal(false);
            setSelectedScheduledRoutine(null);
          }}
          onUpdateDuration={handleUpdateScheduledRoutineDuration}
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