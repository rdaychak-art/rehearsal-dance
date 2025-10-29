import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { date, startMinutes, duration, routineId, roomId } = body;

  const updated = await prisma.scheduledRoutine.update({
    where: { id: params.id },
    data: {
      ...(date ? { date: new Date(date) } : {}),
      ...(typeof startMinutes === 'number' ? { startMinutes } : {}),
      ...(typeof duration === 'number' ? { duration } : {}),
      ...(routineId ? { routineId } : {}),
      ...(roomId ? { roomId } : {}),
    },
    include: { routine: { include: { teacher: true, genre: true, dancers: true } }, room: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.scheduledRoutine.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}


