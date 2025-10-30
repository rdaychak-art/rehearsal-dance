import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: { date?: { gte?: Date; lte?: Date } } = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }

  const items = await prisma.scheduledRoutine.findMany({
    where,
    include: { routine: { include: { teacher: true, genre: true, dancers: true } }, room: true },
    orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, startMinutes, duration, routineId, roomId } = body;

  try {
    const created = await prisma.scheduledRoutine.create({
      data: {
        date: new Date(date),
        startMinutes,
        duration,
        routineId,
        roomId,
      },
      include: { routine: { include: { teacher: true, genre: true, dancers: true } }, room: true },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Time slot already occupied for this room and date.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create scheduled routine' }, { status: 500 });
  }
}


