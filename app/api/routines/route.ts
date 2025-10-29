import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const routines = await prisma.routine.findMany({
    include: { teacher: true, genre: true, dancers: true },
    orderBy: { songTitle: 'asc' },
  });
  return NextResponse.json(routines);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    songTitle,
    duration,
    notes,
    level,
    color,
    teacherId,
    genreId,
    dancerIds = [],
  } = body;

  // Create new routine (PATCH is used for updates)
  const routine = await prisma.routine.create({
    data: {
      songTitle,
      duration,
      notes,
      level,
      color,
      teacherId,
      genreId,
      dancers: { connect: dancerIds.map((id: string) => ({ id })) },
    },
    include: { teacher: true, genre: true, dancers: true },
  });

  return NextResponse.json(routine, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    songTitle,
    duration,
    notes,
    level,
    color,
    teacherId,
    genreId,
    dancerIds = [],
  } = body;

  if (!id) {
    return NextResponse.json({ error: 'Routine ID is required' }, { status: 400 });
  }

  const updateData: any = {
    ...(songTitle !== undefined && { songTitle }),
    ...(duration !== undefined && { duration }),
    ...(notes !== undefined && { notes }),
    ...(level !== undefined && { level }),
    ...(color !== undefined && { color }),
    ...(teacherId !== undefined && { teacherId }),
    ...(genreId !== undefined && { genreId }),
  };

  // Always update dancers if dancerIds is provided
  if (dancerIds !== undefined && Array.isArray(dancerIds)) {
    updateData.dancers = {
      set: dancerIds.map((id: string) => ({ id })),
    };
  }

  const routine = await prisma.routine.update({
    where: { id },
    data: updateData,
    include: { teacher: true, genre: true, dancers: true },
  });

  return NextResponse.json(routine);
}


