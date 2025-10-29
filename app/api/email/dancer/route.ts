import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

interface SendEmailRequestBody {
  dancerId?: string;
  dancerIds?: string[];
  from?: string; // ISO date string (YYYY-MM-DD)
  to?: string;   // ISO date string (YYYY-MM-DD)
  preset?: 'this_week' | 'next_week' | 'this_month';
}

function getDateRangeFromPreset(preset: 'this_week' | 'next_week' | 'this_month'): { from: Date; to: Date } {
  const now = new Date();

  if (preset === 'this_week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day; // Sunday start
    start.setHours(0, 0, 0, 0);
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }

  if (preset === 'next_week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = start.getDate() - day + 7; // next Sunday
    start.setHours(0, 0, 0, 0);
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }

  // this_month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}

function formatMinutesToHHMM(totalMinutes: number): { hour: number; minute: number } {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const mm = String(minute).padStart(2, '0');
  return `${displayHour}:${mm} ${ampm}`;
}

function dayNameFromDate(date: Date): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return names[date.getDay()];
}

function buildEmailText(dancerName: string, items: Array<{ date: Date; startMinutes: number; duration: number; songTitle: string; roomName: string; teacherName: string }>, rangeLabel: string): string {
  if (items.length === 0) {
    return `Hi ${dancerName},\n\nHere's your rehearsal schedule for ${rangeLabel}:\n\nNo rehearsals scheduled in this period.\n\nBest regards,\nDance Studio Team`;
  }

  const lines = items.map((it) => {
    const start = formatMinutesToHHMM(it.startMinutes);
    const endTotal = it.startMinutes + it.duration;
    const end = formatMinutesToHHMM(endTotal);
    const dayName = dayNameFromDate(it.date);
    return `${dayName} ${it.date.toISOString().slice(0, 10)} - ${formatTime(start.hour, start.minute)} to ${formatTime(end.hour, end.minute)}\n  Routine: ${it.songTitle}\n  Room: ${it.roomName}\n  Teacher: ${it.teacherName}`;
  }).join('\n\n');

  return `Hi ${dancerName},\n\nHere's your rehearsal schedule for ${rangeLabel}:\n\n${lines}\n\nPlease arrive 10 minutes early for warm-up.\n\nBest regards,\nDance Studio Team`;
}

async function sendWithSendGrid(toEmail: string, toName: string, subject: string, text: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Dance Studio';

  if (!apiKey || !fromEmail) {
    throw new Error('Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL environment variables');
  }

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: toEmail, name: toName }],
          subject
        }
      ],
      from: { email: fromEmail, name: fromName },
      content: [
        { type: 'text/plain', value: text }
      ]
    })
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`SendGrid error ${resp.status}: ${errText}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendEmailRequestBody;
    const { dancerId, dancerIds, from, to, preset } = body;
    const targetIds = Array.from(new Set((dancerIds && dancerIds.length ? dancerIds : (dancerId ? [dancerId] : []))));

    if (!targetIds.length) {
      return NextResponse.json({ message: 'dancerId or dancerIds is required' }, { status: 400 });
    }

    // Resolve date range
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    let rangeLabel = '';

    if (preset) {
      const { from: f, to: t } = getDateRangeFromPreset(preset);
      fromDate = f;
      toDate = t;
      rangeLabel = preset === 'this_week' ? 'this week' : preset === 'next_week' ? 'next week' : 'this month';
    } else if (from || to) {
      if (from) {
        fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
      }
      if (to) {
        toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
      }
      const fromStr = fromDate ? fromDate.toISOString().slice(0, 10) : '';
      const toStr = toDate ? toDate.toISOString().slice(0, 10) : '';
      rangeLabel = `${fromStr}${fromStr && toStr ? ' to ' : ''}${toStr}` || 'selected dates';
    } else {
      // Default to this week
      const { from: f, to: t } = getDateRangeFromPreset('this_week');
      fromDate = f;
      toDate = t;
      rangeLabel = 'this week';
    }

    const dancers = await prisma.dancer.findMany({ where: { id: { in: targetIds } } });
    const dancerById = new Map(dancers.map(d => [d.id, d]));
    const results: { id: string; status: 'sent' | 'skipped'; reason?: string }[] = [];

    for (const id of targetIds) {
      const dancer = dancerById.get(id);
      if (!dancer) {
        results.push({ id, status: 'skipped', reason: 'not found' });
        continue;
      }
      const email = Array.isArray(dancer.email) ? dancer.email[0] : dancer.email;
      if (!email) {
        results.push({ id, status: 'skipped', reason: 'no email' });
        continue;
      }

      const where: any = {
        routine: {
          dancers: { some: { id } }
        }
      };
      if (fromDate || toDate) {
        where.date = {};
        if (fromDate) where.date.gte = fromDate;
        if (toDate) where.date.lte = toDate;
      }

      const items = await prisma.scheduledRoutine.findMany({
        where,
        include: { routine: { include: { teacher: true, genre: true, dancers: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }]
      });

      const simplified = items.map(it => ({
        date: new Date(it.date),
        startMinutes: it.startMinutes,
        duration: it.duration,
        songTitle: it.routine.songTitle,
        roomName: it.room.name,
        teacherName: it.routine.teacher.name
      }));

      const subject = `Your rehearsal schedule for ${rangeLabel}`;
      const text = buildEmailText(dancer.name, simplified, rangeLabel);

      try {
        await sendWithSendGrid(email, dancer.name, subject, text);
        results.push({ id, status: 'sent' });
      } catch (e: any) {
        results.push({ id, status: 'skipped', reason: e?.message || 'send failed' });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Failed to send email' }, { status: 500 });
  }
}


