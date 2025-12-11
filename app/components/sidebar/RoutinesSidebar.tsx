'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Routine } from '../../types/routine';
import { ScheduledRoutine } from '../../types/schedule';
import { RoutineCard } from './RoutineCard';
import { Search, Plus, Filter } from 'lucide-react';
import { ManageTeachersModal } from '../modals/ManageTeachersModal';
import { ManageGenresModal } from '../modals/ManageGenresModal';
import { ManageLevelsModal } from '../modals/ManageLevelsModal';
import { RoutineFiltersModal } from '../modals/RoutineFiltersModal';

interface RoutinesSidebarProps {
  routines: Routine[];
  scheduledRoutines: ScheduledRoutine[];
  onRoutineClick: (routine: Routine) => void;
  onAddRoutine: () => void;
  onToggleInactive?: (routine: Routine) => void;
  onTeachersChange?: (teachers: { id: string; name: string; email?: string | null }[]) => void;
  onGenresChange?: (genres: { id: string; name: string }[]) => void;
  onLevelsChange?: (levels: { id: string; name: string; color: string }[]) => void;
}

export const RoutinesSidebar: React.FC<RoutinesSidebarProps> = ({
  routines,
  scheduledRoutines,
  onRoutineClick,
  onAddRoutine,
  onToggleInactive,
  onTeachersChange,
  onGenresChange,
  onLevelsChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [openTeachers, setOpenTeachers] = useState(false);
  const [openGenres, setOpenGenres] = useState(false);
  const [openLevels, setOpenLevels] = useState(false);
  const [openFilters, setOpenFilters] = useState(false);
  const [hideInactive, setHideInactive] = useState(false);
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'none'>('A-Z');
  const [teachers, setTeachers] = useState<{ id: string; name: string; email?: string | null }[]>([]);
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    // Load initial teachers/genres to populate the management modals
    const load = async () => {
      try {
        const [tRes, gRes, lRes] = await Promise.all([
          fetch('/api/teachers'),
          fetch('/api/genres'),
          fetch('/api/levels')
        ]);
        const [tData, gData, lData] = await Promise.all([tRes.json(), gRes.json(), lRes.json()]);
        setTeachers(tData);
        setGenres(gData);
        setLevels(lData);
      } catch {
        // best-effort; modals can still fetch on open
      }
    };
    load();
  }, []);

  // Count how many times each routine is scheduled and calculate total hours
  const routineScheduledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scheduledRoutines.forEach(scheduled => {
      counts[scheduled.routineId] = (counts[scheduled.routineId] || 0) + 1;
    });
    return counts;
  }, [scheduledRoutines]);

  // Calculate total scheduled hours for each routine
  const routineScheduledHours = useMemo(() => {
    const hours: Record<string, number> = {};
    scheduledRoutines.forEach(scheduled => {
      const routineId = scheduled.routineId;
      const hoursInThisSlot = scheduled.duration / 60; // Convert minutes to hours
      hours[routineId] = (hours[routineId] || 0) + hoursInThisSlot;
    });
    return hours;
  }, [scheduledRoutines]);

  const filteredAndSortedRoutines = useMemo(() => {
    // Safety check: ensure routines is always an array
    if (!Array.isArray(routines)) {
      return [];
    }
    
    const filtered = routines.filter(routine => {
      const matchesSearch = routine.songTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           routine.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           routine.dancers.some(dancer => 
                             dancer.name.toLowerCase().includes(searchTerm.toLowerCase())
                           );
      
      const matchesGenre = selectedGenre === 'all' || routine.genre.name === selectedGenre;
      const matchesTeacher = selectedTeacher === 'all' || routine.teacher.name === selectedTeacher;
      const matchesLevel = selectedLevel === 'all' || routine.level?.name === selectedLevel;
      
      return matchesSearch && matchesGenre && matchesTeacher && matchesLevel;
    });

    // Separate routines by status:
    // - Inactive: manually marked as inactive (only)
    // - Active: not manually marked inactive
    const activeRoutines: Routine[] = [];
    const inactiveRoutines: Routine[] = [];

    filtered.forEach(routine => {
      const isManuallyInactive = routine.isInactive || false;
      
      // A routine is inactive only if manually marked as inactive
      // New routines with 0 scheduled instances are still considered active
      if (isManuallyInactive) {
        inactiveRoutines.push(routine);
      } else {
        activeRoutines.push(routine);
      }
    });

    // Sort each category alphabetically by songTitle if sorting is enabled
    if (sortOrder !== 'none') {
      const sortByTitle = (a: Routine, b: Routine) => {
        const comparison = a.songTitle.localeCompare(b.songTitle, undefined, { sensitivity: 'base' });
        return sortOrder === 'A-Z' ? comparison : -comparison;
      };
      
      activeRoutines.sort(sortByTitle);
      inactiveRoutines.sort(sortByTitle);
    }

    // If hideInactive is true, filter out inactive routines
    // Otherwise, show them at the bottom
    const routinesToShow = hideInactive 
      ? [...activeRoutines]
      : [...activeRoutines, ...inactiveRoutines];

    return routinesToShow;
  }, [routines, searchTerm, selectedGenre, selectedTeacher, selectedLevel, hideInactive, sortOrder]);

  // Safety check: ensure routines is always an array before mapping
  // Memoize to prevent recalculation on every render
  const uniqueGenres = useMemo(() => {
    return Array.isArray(routines) ? Array.from(new Set(routines.map(r => r.genre.name))) : [];
  }, [routines]);
  
  const uniqueTeachers = useMemo(() => {
    return Array.isArray(routines) ? Array.from(new Set(routines.map(r => r.teacher.name))) : [];
  }, [routines]);
  
  const uniqueLevels = useMemo(() => {
    return Array.isArray(routines) ? Array.from(new Set(routines.filter(r => r.level).map(r => r.level!.name))) : [];
  }, [routines]);
  
  // Debug logging - only log when values actually change
  useEffect(() => {
    console.log('Available genres:', uniqueGenres);
    console.log('Available teachers:', uniqueTeachers);
    console.log('Selected genre:', selectedGenre);
    console.log('Selected teacher:', selectedTeacher);
    console.log('Filtered routines count:', filteredAndSortedRoutines.length);
  }, [uniqueGenres, uniqueTeachers, selectedGenre, selectedTeacher, filteredAndSortedRoutines.length]);

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        {/* Logo */}
        <div className="mb-4 flex justify-center">
          <Image
            src="/RehearsalHub.webp"
            alt="RehearsalHub Logo"
            width={200}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Routines</h2>
          <button
            onClick={onAddRoutine}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Routine
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setOpenTeachers(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Manage Teachers"
          >
            Manage Teachers
          </button>
          <button
            onClick={() => setOpenGenres(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Manage Genres"
          >
            Manage Genres
          </button>
          <button
            onClick={() => setOpenLevels(true)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Manage Levels"
          >
            Manage Levels
          </button>
        </div>
        {/* Search Bar */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search routines, dancers, teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Filter Button */}
        <button
          onClick={() => setOpenFilters(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Routines List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredAndSortedRoutines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No routines found</p>
              <p className="text-gray-400 text-xs mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            filteredAndSortedRoutines.map(routine => {
              const scheduledCount = routineScheduledCounts[routine.id] || 0;
              const scheduledHours = routineScheduledHours[routine.id] || 0;
              const isManuallyInactive = routine.isInactive || false;
              // Only consider routines inactive if manually marked as inactive
              // Routines with 0 scheduled instances are still considered active
              const isInactive = isManuallyInactive;
              return (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onClick={onRoutineClick}
                  onToggleInactive={onToggleInactive}
                  scheduledCount={scheduledCount}
                  scheduledHours={scheduledHours}
                  isInactive={isInactive}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Management Modals */}
      <ManageTeachersModal
        isOpen={openTeachers}
        teachers={teachers}
        onClose={() => setOpenTeachers(false)}
        onChange={(next) => {
          setTeachers(next);
          // Propagate changes to parent
          onTeachersChange?.(next);
        }}
      />
      <ManageGenresModal
        isOpen={openGenres}
        genres={genres}
        onClose={() => setOpenGenres(false)}
        onChange={(next) => {
          setGenres(next);
          // Propagate changes to parent
          onGenresChange?.(next);
        }}
      />
      <ManageLevelsModal
        isOpen={openLevels}
        levels={levels}
        onClose={() => setOpenLevels(false)}
        onChange={(next) => {
          setLevels(next);
          // Propagate changes to parent
          onLevelsChange?.(next);
        }}
      />
      <RoutineFiltersModal
        isOpen={openFilters}
        onClose={() => setOpenFilters(false)}
        selectedGenre={selectedGenre}
        selectedTeacher={selectedTeacher}
        selectedLevel={selectedLevel}
        hideInactive={hideInactive}
        sortOrder={sortOrder}
        uniqueGenres={uniqueGenres}
        uniqueTeachers={uniqueTeachers}
        uniqueLevels={uniqueLevels}
        onGenreChange={setSelectedGenre}
        onTeacherChange={setSelectedTeacher}
        onLevelChange={setSelectedLevel}
        onHideInactiveChange={setHideInactive}
        onSortOrderChange={setSortOrder}
      />
    </div>
  );
};
