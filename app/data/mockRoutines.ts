import { Routine, Teacher, Genre } from '../types/routine';
import { mockDancers } from './mockDancers';

export const mockTeachers: Teacher[] = [
  { id: 'teacher-1', name: 'Maria Santos', email: 'maria@studio.com' },
  { id: 'teacher-2', name: 'David Park', email: 'david@studio.com' },
  { id: 'teacher-3', name: 'Lisa Chen', email: 'lisa@studio.com' },
  { id: 'teacher-4', name: 'James Wilson', email: 'james@studio.com' }
];

export const mockGenres: Genre[] = [
  { id: 'genre-1', name: 'Ballet', color: '#A78BFA' },
  { id: 'genre-2', name: 'Hip Hop', color: '#FB923C' },
  { id: 'genre-3', name: 'Contemporary', color: '#14B8A6' },
  { id: 'genre-4', name: 'Jazz', color: '#F472B6' },
  { id: 'genre-5', name: 'Tap', color: '#FBBF24' },
  { id: 'genre-6', name: 'Modern', color: '#8B5CF6' }
];

export const mockRoutines: Routine[] = [
  {
    id: 'routine-1',
    songTitle: 'Swan Lake Suite',
    dancers: [mockDancers[0], mockDancers[2], mockDancers[6], mockDancers[8]],
    teacher: mockTeachers[0],
    genre: mockGenres[0],
    duration: 60,
    level: 'Intermediate',
    notes: 'Focus on technique and precision',
    scheduledHours: 0,
    color: '#A78BFA'
  },
  {
    id: 'routine-2',
    songTitle: 'Urban Beat',
    dancers: [mockDancers[1], mockDancers[3], mockDancers[7]],
    teacher: mockTeachers[1],
    genre: mockGenres[1],
    duration: 60,
    level: 'Advanced',
    notes: 'High energy routine',
    scheduledHours: 0,
    color: '#FB923C'
  },
  {
    id: 'routine-3',
    songTitle: 'Emotional Journey',
    dancers: [mockDancers[2], mockDancers[5], mockDancers[9]],
    teacher: mockTeachers[2],
    genre: mockGenres[2],
    duration: 60,
    level: 'Beginner',
    notes: 'Expressive contemporary piece',
    scheduledHours: 0,
    color: '#14B8A6'
  },
  {
    id: 'routine-4',
    songTitle: 'Jazz Fusion',
    dancers: [mockDancers[4], mockDancers[6], mockDancers[9]],
    teacher: mockTeachers[3],
    genre: mockGenres[3],
    duration: 60,
    level: 'Intermediate',
    notes: 'Smooth jazz with modern elements',
    scheduledHours: 0,
    color: '#F472B6'
  },
  {
    id: 'routine-5',
    songTitle: 'Tap Rhythm',
    dancers: [mockDancers[4], mockDancers[8]],
    teacher: mockTeachers[0],
    genre: mockGenres[4],
    duration: 60,
    level: 'Advanced',
    notes: 'Fast-paced tap routine',
    scheduledHours: 0,
    color: '#FBBF24'
  },
  {
    id: 'routine-6',
    songTitle: 'Modern Expression',
    dancers: [mockDancers[0], mockDancers[5], mockDancers[6]],
    teacher: mockTeachers[2],
    genre: mockGenres[5],
    duration: 60,
    level: 'Intermediate',
    notes: 'Abstract modern dance',
    scheduledHours: 0,
    color: '#8B5CF6'
  },
  {
    id: 'routine-7',
    songTitle: 'Street Vibes',
    dancers: [mockDancers[1], mockDancers[3], mockDancers[7]],
    teacher: mockTeachers[1],
    genre: mockGenres[1],
    duration: 60,
    level: 'Beginner',
    notes: 'Urban street dance style',
    scheduledHours: 0,
    color: '#FB923C'
  },
  {
    id: 'routine-8',
    songTitle: 'Classical Variations',
    dancers: [mockDancers[0], mockDancers[2], mockDancers[8]],
    teacher: mockTeachers[0],
    genre: mockGenres[0],
    duration: 120,
    level: 'Advanced',
    notes: 'Traditional ballet variations',
    scheduledHours: 0,
    color: '#A78BFA'
  }
];
