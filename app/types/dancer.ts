export interface Dancer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  birthday?: string; // ISO date string or formatted date
  gender?: string;
  classes?: string[]; // Array of class names
  email?: string | string[]; // Can be single email or array of emails (semicolon-separated)
  avatar?: string;
  phone?: string; // Primary phone
  level?: 'beginner' | 'intermediate' | 'advanced';
  genres?: string[];
}

export interface DancerSchedule {
  dancerId: string;
  dancerName: string;
  routines: {
    routineId: string;
    songTitle: string;
    roomName: string;
    startTime: string;
    endTime: string;
    day: string;
  }[];
}
