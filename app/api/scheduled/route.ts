import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: any = {};
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
}


