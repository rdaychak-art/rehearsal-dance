import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    const routines = await prisma.routine.findMany({
      include: { teacher: true, genre: true, level: true, dancers: true },
      orderBy: { songTitle: 'asc' },
    });
    return NextResponse.json(routines);
  } catch (e: unknown) {
    console.error('Failed to fetch routines:', e);
    return NextResponse.json({ error: 'Failed to fetch routines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      songTitle,
      duration,
      notes,
      levelId,
      color,
      teacherId,
      genreId,
      dancerIds = [],
      isInactive = false,
    } = body;

    // Validate required fields
    if (!songTitle || !teacherId || !genreId) {
      return NextResponse.json(
        { error: 'songTitle, teacherId, and genreId are required' },
        { status: 400 }
      );
    }

    // Create new routine (PATCH is used for updates)
    const routine = await prisma.routine.create({
      data: {
        songTitle,
        duration,
        notes,
        levelId: levelId || null,
        color,
        teacherId,
        genreId,
        isInactive,
        dancers: { connect: dancerIds.map((id: string) => ({ id })) },
      },
      include: { teacher: true, genre: true, level: true, dancers: true },
    });

    return NextResponse.json(routine, { status: 201 });
  } catch (e: unknown) {
    console.error('Failed to create routine:', e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return NextResponse.json({ error: 'A routine with this name already exists' }, { status: 409 });
      }
      if (e.code === 'P2003') {
        return NextResponse.json({ error: 'Invalid teacher, genre, or level ID' }, { status: 400 });
      }
      if (e.code === 'P2025') {
        return NextResponse.json({ error: 'Referenced record not found' }, { status: 404 });
      }
    }
    const errorMessage = e instanceof Error ? e.message : 'Failed to create routine';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      songTitle,
      duration,
      notes,
      levelId,
      color,
      teacherId,
      genreId,
      dancerIds = [],
      isInactive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Routine ID is required' }, { status: 400 });
    }

    const updateData: {
      songTitle?: string;
      duration?: number;
      notes?: string | null;
      levelId?: string | null;
      color?: string;
      teacherId?: string;
      genreId?: string;
      isInactive?: boolean;
      dancers?: { set: { id: string }[] };
    } = {
      ...(songTitle !== undefined && { songTitle }),
      ...(duration !== undefined && { duration }),
      ...(notes !== undefined && { notes }),
      ...(levelId !== undefined && { levelId: levelId || null }),
      ...(color !== undefined && { color }),
      ...(teacherId !== undefined && { teacherId }),
      ...(genreId !== undefined && { genreId }),
      ...(isInactive !== undefined && { isInactive }),
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
      include: { teacher: true, genre: true, level: true, dancers: true },
    });

    return NextResponse.json(routine);
  } catch (e: unknown) {
    console.error('Failed to update routine:', e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return NextResponse.json({ error: 'A routine with this name already exists' }, { status: 409 });
      }
      if (e.code === 'P2003') {
        return NextResponse.json({ error: 'Invalid teacher, genre, or level ID' }, { status: 400 });
      }
      if (e.code === 'P2025') {
        return NextResponse.json({ error: 'Routine not found' }, { status: 404 });
      }
    }
    const errorMessage = e instanceof Error ? e.message : 'Failed to update routine';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


