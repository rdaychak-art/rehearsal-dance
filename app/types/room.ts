export interface Room {
  id: string;
  name: string;
  isActive: boolean;
  capacity?: number;
  equipment?: string[];
}

export interface RoomConfiguration {
  totalRooms: number;
  activeRooms: Room[];
  defaultCapacity: number;
}
