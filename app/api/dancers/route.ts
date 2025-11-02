import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const dancers = await prisma.dancer.findMany({
    orderBy: { name: 'asc' },
  });
  
  // Convert semicolon-separated email strings back to arrays for frontend compatibility
  const transformedDancers = dancers.map((dancer: { email: string | null }) => ({
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
    const idsParam = searchParams.get('ids');
    const id = searchParams.get('id');

    if (!id && !idsParam) {
      return NextResponse.json(
        { error: 'Dancer ID(s) are required' },
        { status: 400 }
      );
    }

    // Batch delete when ids (comma-separated) are provided
    if (idsParam) {
      const ids = idsParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (ids.length === 0) {
        return NextResponse.json(
          { error: 'No valid IDs provided' },
          { status: 400 }
        );
      }

      const result = await prisma.dancer.deleteMany({
        where: { id: { in: ids } },
      });

      return NextResponse.json({ success: true, count: result.count }, { status: 200 });
    }

    // Single delete fallback
    await prisma.dancer.delete({
      where: { id: id as string },
    });

    return NextResponse.json({ success: true, count: 1 }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting dancer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete dancer';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

