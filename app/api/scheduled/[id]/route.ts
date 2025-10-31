import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

// Helper to parse YYYY-MM-DD to local Date (midnight local time)
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { date, startMinutes, duration, routineId, roomId } = body;

  try {
    const updated = await prisma.scheduledRoutine.update({
      where: { id: params.id },
      data: {
        ...(date ? { date: parseLocalDate(date) } : {}),
        ...(typeof startMinutes === 'number' ? { startMinutes } : {}),
        ...(typeof duration === 'number' ? { duration } : {}),
        ...(routineId ? { routineId } : {}),
        ...(roomId ? { roomId } : {}),
      },
      include: { routine: { include: { teacher: true, genre: true, dancers: true } }, room: true },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Time slot already occupied for this room and date.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update scheduled routine' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.scheduledRoutine.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}


