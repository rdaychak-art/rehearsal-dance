import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

interface SendEmailRequestBody {
  dancerId?: string;
  dancerIds?: string[];
  from?: string; // ISO date string (YYYY-MM-DD)
  to?: string;   // ISO date string (YYYY-MM-DD)
  preset?: 'this_week' | 'next_week' | 'this_month';
  levelIds?: string[];
  fromEmail?: string;
  customMessage?: string;
}

// Helper to parse YYYY-MM-DD to UTC Date (midnight UTC)
// This ensures dates are stored consistently regardless of server timezone
function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Helper to format Date to YYYY-MM-DD string (using UTC components)
// This ensures we get the calendar date, not affected by timezone
function formatDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function buildEmailText(dancerName: string, items: Array<{ date: Date; startMinutes: number; duration: number; songTitle: string; roomName: string; teacherName: string }>, rangeLabel: string, customMessage?: string): string {
  const customMsg = customMessage?.trim() ? `\n${customMessage.trim()}\n\n` : '';
  
  if (items.length === 0) {
    return `Hi ${dancerName},${customMsg}Here's your rehearsal schedule for ${rangeLabel}:\n\nNo rehearsals scheduled in this period.\n\nSincerely, Performing Dance Arts.`;
  }

  const lines = items.map((it) => {
    const start = formatMinutesToHHMM(it.startMinutes);
    const endTotal = it.startMinutes + it.duration;
    const end = formatMinutesToHHMM(endTotal);
    const formattedDate = it.date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    return `${formattedDate} - ${formatTime(start.hour, start.minute)} to ${formatTime(end.hour, end.minute)}\n  Routine: ${it.songTitle}\n  Room: ${it.roomName}\n  Teacher: ${it.teacherName}`;
  }).join('\n\n');

  return `Hi ${dancerName},${customMsg}Here's your rehearsal schedule for ${rangeLabel}:\n\n${lines}\n\nPlease arrive 10 minutes early for warm-up.\n\nSincerely, Performing Dance Arts.`;
}

function buildTeacherEmailText(teacherName: string, items: Array<{ date: Date; startMinutes: number; duration: number; songTitle: string; roomName: string; dancerNames: string[] }>, rangeLabel: string, customMessage?: string): string {
  const customMsg = customMessage?.trim() ? `\n${customMessage.trim()}\n\n` : '';
  
  if (items.length === 0) {
    return `Hi ${teacherName},${customMsg}Here are your rehearsal schedules for ${rangeLabel}:\n\nNo rehearsals scheduled in this period.\n\nSincerely, Performing Dance Arts.`;
  }

  const lines = items.map((it) => {
    const start = formatMinutesToHHMM(it.startMinutes);
    const endTotal = it.startMinutes + it.duration;
    const end = formatMinutesToHHMM(endTotal);
    const formattedDate = it.date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dancersList = it.dancerNames.length > 0 ? `\n  Dancers: ${it.dancerNames.join(', ')}` : '';
    return `${formattedDate} - ${formatTime(start.hour, start.minute)} to ${formatTime(end.hour, end.minute)}\n  Routine: ${it.songTitle}\n  Room: ${it.roomName}${dancersList}`;
  }).join('\n\n');

  return `Hi ${teacherName},${customMsg}Here are your rehearsal schedules for ${rangeLabel}:\n\n${lines}\n\nSincerely, Performing Dance Arts.`;
}

async function sendWithSendGrid(toEmail: string, toName: string, subject: string, text: string, customFromEmail?: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromEmail = customFromEmail || defaultFromEmail;
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
    const { dancerId, dancerIds, from, to, preset, levelIds, fromEmail, customMessage } = body;
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
        fromDate = parseDateString(from);
      }
      if (to) {
        const [year, month, day] = to.split('-').map(Number);
        toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      }
      rangeLabel = `${from || ''}${from && to ? ' to ' : ''}${to || ''}` || 'selected dates';
    } else {
      // Default to this week
      const { from: f, to: t } = getDateRangeFromPreset('this_week');
      fromDate = f;
      toDate = t;
      rangeLabel = 'this week';
    }

    const dancers = await prisma.dancer.findMany({ where: { id: { in: targetIds } } });
    type DancerType = { id: string; name: string; email: string | null };
    const dancerById = new Map<string, DancerType>(
      dancers.map((d: DancerType) => [d.id, d])
    );
    const results: { id: string; status: 'sent' | 'skipped'; reason?: string }[] = [];

    for (const id of targetIds) {
      const dancer = dancerById.get(id);
      if (!dancer) {
        results.push({ id, status: 'skipped', reason: 'not found' });
        continue;
      }
      const email = dancer.email;
      if (!email) {
        results.push({ id, status: 'skipped', reason: 'no email' });
        continue;
      }

      const where: {
        routine: { 
          dancers: { some: { id: string } };
          levelId?: { in: string[] } | null;
        };
        date?: { gte?: Date; lte?: Date };
      } = {
        routine: {
          dancers: { some: { id } }
        }
      };
      if (levelIds && levelIds.length > 0) {
        where.routine.levelId = { in: levelIds };
      }
      if (fromDate || toDate) {
        where.date = {};
        if (fromDate) {
          where.date.gte = fromDate;
        }
        if (toDate) {
          where.date.lte = toDate;
        }
      }

      const items = await prisma.scheduledRoutine.findMany({
        where,
        include: { routine: { include: { teacher: true, genre: true, level: true, dancers: true } }, room: true },
        orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }]
      });

      const simplified = items.map((it: {
        date: Date;
        startMinutes: number;
        duration: number;
        routine: { songTitle: string; teacher: { name: string } };
        room: { name: string };
      }) => {
        // Extract calendar date from UTC date stored in database
        // Database stores dates as UTC, so we use UTC components to get the calendar date
        const dateObj = it.date instanceof Date ? it.date : new Date(it.date);
        const dateString = formatDateString(dateObj);
        const normalizedDate = parseDateString(dateString);
        
        return {
          date: normalizedDate,
          startMinutes: it.startMinutes,
          duration: it.duration,
          songTitle: it.routine.songTitle,
          roomName: it.room.name,
          teacherName: it.routine.teacher.name
        };
      });

      const subject = `Your rehearsal schedule for ${rangeLabel}`;
      const text = buildEmailText(dancer.name, simplified, rangeLabel, customMessage);

      try {
        await sendWithSendGrid(email, dancer.name, subject, text, fromEmail);
        results.push({ id, status: 'sent' });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'send failed';
        results.push({ id, status: 'skipped', reason: errorMessage });
      }
    }

    // Send emails to teachers about routines
    const teacherResults: { teacherId: string; status: 'sent' | 'skipped'; reason?: string }[] = [];

    // Collect all unique teacher IDs from routines that match the dancers/levels/date filters
    const routineWhere: {
      levelId?: { in: string[] };
      dancers?: { some: { id: { in: string[] } } };
    } = {};
    
    if (levelIds && levelIds.length > 0) {
      routineWhere.levelId = { in: levelIds };
    }
    if (targetIds.length > 0) {
      routineWhere.dancers = { some: { id: { in: targetIds } } };
    }

    const dateWhere: {
      gte?: Date;
      lte?: Date;
    } = {};
    if (fromDate) dateWhere.gte = fromDate;
    if (toDate) dateWhere.lte = toDate;

    // Find all scheduled routines that match the criteria to identify which teachers should get emails
    const relevantScheduledRoutines = await prisma.scheduledRoutine.findMany({
      where: {
        routine: Object.keys(routineWhere).length > 0 ? routineWhere : undefined,
        date: Object.keys(dateWhere).length > 0 ? dateWhere : undefined
      },
      include: {
        routine: {
          include: {
            teacher: true
          }
        }
      }
    });

    // Get unique teacher IDs from routines that match the criteria
    const teacherIds = Array.from(new Set(relevantScheduledRoutines.map(sr => sr.routine.teacherId)));
    
    if (teacherIds.length > 0) {
      // Get all teachers with their email addresses
      const teachers = await prisma.teacher.findMany({
        where: { id: { in: teacherIds } }
      });

      const teacherById = new Map(teachers.map(t => [t.id, t]));

      // For each teacher, get all their scheduled routines in the date range
      // This gives teachers their complete schedule for the period
      for (const teacherId of teacherIds) {
        const teacher = teacherById.get(teacherId);
        if (!teacher || !teacher.email) {
          teacherResults.push({ teacherId, status: 'skipped', reason: teacher ? 'no email' : 'not found' });
          continue;
        }

        const teacherWhere: {
          routine: { teacherId: string; levelId?: { in: string[] } | null };
          date?: { gte?: Date; lte?: Date };
        } = {
          routine: {
            teacherId
          }
        };

        // Apply level filter if provided (to match what dancers received)
        if (levelIds && levelIds.length > 0) {
          teacherWhere.routine.levelId = { in: levelIds };
        }

        // Apply date range filter
        if (fromDate || toDate) {
          teacherWhere.date = {};
          if (fromDate) teacherWhere.date.gte = fromDate;
          if (toDate) teacherWhere.date.lte = toDate;
        }

        const teacherItems = await prisma.scheduledRoutine.findMany({
          where: teacherWhere,
          include: {
            routine: {
              include: {
                teacher: true,
                dancers: true
              }
            },
            room: true
          },
          orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }]
        });

        const teacherSimplified = teacherItems.map((it: {
          date: Date;
          startMinutes: number;
          duration: number;
          routine: { songTitle: string; dancers: Array<{ name: string }> };
          room: { name: string };
        }) => {
          // Extract calendar date from UTC date stored in database
          // Database stores dates as UTC, so we use UTC components to get the calendar date
          const dateObj = it.date instanceof Date ? it.date : new Date(it.date);
          const dateString = formatDateString(dateObj);
          const normalizedDate = parseDateString(dateString);
          
          return {
            date: normalizedDate,
            startMinutes: it.startMinutes,
            duration: it.duration,
            songTitle: it.routine.songTitle,
            roomName: it.room.name,
            dancerNames: it.routine.dancers.map(d => d.name)
          };
        });

        const teacherSubject = `Your rehearsal schedule for ${rangeLabel}`;
        const teacherText = buildTeacherEmailText(teacher.name, teacherSimplified, rangeLabel, customMessage);

        try {
          await sendWithSendGrid(teacher.email, teacher.name, teacherSubject, teacherText, fromEmail);
          teacherResults.push({ teacherId, status: 'sent' });
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'send failed';
          teacherResults.push({ teacherId, status: 'skipped', reason: errorMessage });
        }
      }
    }

    return NextResponse.json({ success: true, results, teacherResults });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


