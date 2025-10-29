import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const dancers = await prisma.dancer.findMany({
    orderBy: { name: 'asc' },
  });
  
  // Convert semicolon-separated email strings back to arrays for frontend compatibility
  const transformedDancers = dancers.map(dancer => ({
    ...dancer,
    email: dancer.email && dancer.email.includes(';') 
      ? dancer.email.split(';').map(e => e.trim()).filter(e => e.length > 0)
      : dancer.email || undefined
  }));
  
  return NextResponse.json(transformedDancers);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Support single or bulk create
  const dancers = Array.isArray(body) ? body : [body];

  const created = await prisma.$transaction(
    dancers.map((d) =>
      prisma.dancer.upsert({
        where: { id: d.id ?? 'no-id-' + Math.random().toString(36).slice(2) },
        update: {
          name: d.name,
          firstName: d.firstName ?? null,
          lastName: d.lastName ?? null,
          age: d.age ?? null,
          birthday: d.birthday ?? null,
          gender: d.gender ?? null,
          phone: d.phone ?? null,
          email: Array.isArray(d.email) ? d.email.join('; ') : (d.email ?? null),
          avatar: d.avatar ?? null,
          level: d.level ?? null,
          genres: d.genres ?? [],
          classes: d.classes ?? [],
        },
        create: {
          id: d.id ?? undefined,
          name: d.name,
          firstName: d.firstName ?? null,
          lastName: d.lastName ?? null,
          age: d.age ?? null,
          birthday: d.birthday ?? null,
          gender: d.gender ?? null,
          phone: d.phone ?? null,
          email: Array.isArray(d.email) ? d.email.join('; ') : (d.email ?? null),
          avatar: d.avatar ?? null,
          level: d.level ?? null,
          genres: d.genres ?? [],
          classes: d.classes ?? [],
        },
      })
    )
  );

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Dancer ID is required' },
        { status: 400 }
      );
    }

    await prisma.dancer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting dancer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete dancer' },
      { status: 500 }
    );
  }
}

