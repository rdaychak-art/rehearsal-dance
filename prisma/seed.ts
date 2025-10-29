import { PrismaClient } from '@prisma/client';
import { mockRoutines, mockTeachers, mockGenres } from '../app/data/mockRoutines';
import { mockDancers } from '../app/data/mockDancers';
import { mockRooms, mockScheduledRoutines } from '../app/data/mockSchedules';

const prisma = new PrismaClient();

async function main() {
  // Teachers
  for (const t of mockTeachers) {
    await prisma.teacher.upsert({
      where: { id: t.id },
      update: { name: t.name, email: t.email ?? null },
      create: { id: t.id, name: t.name, email: t.email ?? null },
    });
  }

  // Genres
  for (const g of mockGenres) {
    await prisma.genre.upsert({
      where: { id: g.id },
      update: { name: g.name, color: g.color },
      create: { id: g.id, name: g.name, color: g.color },
    });
  }

  // Dancers
  for (const d of mockDancers) {
    // Handle email as string or array (join with semicolon if array)
    const email = Array.isArray(d.email) 
      ? (d.email.length > 0 ? d.email.join('; ') : null) 
      : (d.email ?? null);
    
    const dancerData = {
      name: d.name,
      firstName: d.firstName ?? null,
      lastName: d.lastName ?? null,
      age: d.age ?? null,
      birthday: d.birthday ?? null,
      gender: d.gender ?? null,
      phone: d.phone ?? null,
      email: email,
      avatar: d.avatar ?? null,
      level: d.level ?? null,
      genres: d.genres ?? [],
      classes: d.classes ?? [],
    };
    
    await prisma.dancer.upsert({
      where: { id: d.id },
      update: dancerData,
      create: {
        id: d.id,
        ...dancerData,
      },
    });
  }

  // Rooms
  for (const r of mockRooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        isActive: r.isActive,
        capacity: r.capacity ?? null,
        equipment: r.equipment ?? [],
      },
      create: {
        id: r.id,
        name: r.name,
        isActive: r.isActive,
        capacity: r.capacity ?? null,
        equipment: r.equipment ?? [],
      },
    });
  }

  // Routines
  for (const r of mockRoutines) {
    await prisma.routine.upsert({
      where: { id: r.id },
      update: {
        songTitle: r.songTitle,
        duration: r.duration,
        notes: r.notes ?? null,
        level: r.level ?? null,
        color: r.color,
        teacherId: r.teacher.id,
        genreId: r.genre.id,
        dancers: { set: r.dancers.map((d) => ({ id: d.id })) },
      },
      create: {
        id: r.id,
        songTitle: r.songTitle,
        duration: r.duration,
        notes: r.notes ?? null,
        level: r.level ?? null,
        color: r.color,
        teacherId: r.teacher.id,
        genreId: r.genre.id,
        dancers: { connect: r.dancers.map((d) => ({ id: d.id })) },
      },
    });
  }

  // Scheduled routines
  for (const s of mockScheduledRoutines) {
    const startMinutes = s.startTime.hour * 60 + s.startTime.minute;
    await prisma.scheduledRoutine.upsert({
      where: { id: s.id },
      update: {
        date: new Date(s.date),
        startMinutes,
        duration: s.duration,
        routineId: s.routineId,
        roomId: s.roomId,
      },
      create: {
        id: s.id,
        date: new Date(s.date),
        startMinutes,
        duration: s.duration,
        routineId: s.routineId,
        roomId: s.roomId,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


