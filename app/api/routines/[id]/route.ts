import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const routine = await prisma.routine.findUnique({
    where: { id: params.id },
    include: { teacher: true, genre: true, dancers: true },
  });
  if (!routine) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(routine);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { songTitle, duration, notes, level, color, teacherId, genreId, dancerIds } = body;

  const routine = await prisma.routine.update({
    where: { id: params.id },
    data: {
      songTitle,
      duration,
      notes,
      level,
      color,
      teacherId,
      genreId,
      ...(Array.isArray(dancerIds)
        ? { dancers: { set: dancerIds.map((id: string) => ({ id })) } }
        : {}),
    },
    include: { teacher: true, genre: true, dancers: true },
  });
  return NextResponse.json(routine);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.routine.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}


