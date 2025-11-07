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
  teacherIds?: string[]; // Optional: filter which teachers to send emails to
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

// function dayNameFromDate(date: Date): string {
//   const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//   return names[date.getDay()];
// }

function buildEmailText(dancerName: string, items: Array<{ date: Date; startMinutes: number; duration: number; songTitle: string; genreName: string; roomName: string; teacherName: string }>, rangeLabel: string, customMessage?: string): string {
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
    return `${formattedDate} - ${formatTime(start.hour, start.minute)} to ${formatTime(end.hour, end.minute)}\n  Routine: ${it.songTitle}\n  Genre: ${it.genreName}\n  Room: ${it.roomName}\n  Teacher: ${it.teacherName}`;
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
  const sendStartTime = Date.now();
  const apiKey = process.env.SENDGRID_API_KEY;
  const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromEmail = customFromEmail || defaultFromEmail;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Dance Studio';

  if (!apiKey || !fromEmail) {
    console.error('[EMAIL API] SendGrid configuration error: Missing API key or from email');
    throw new Error('Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL environment variables');
  }

  const payload = {
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
  };

  console.log(`[EMAIL API] SendGrid API call: to=${toEmail}, from=${fromEmail}, subject="${subject}", textLength=${text.length}`);

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const sendDuration = Date.now() - sendStartTime;

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error(`[EMAIL API] SendGrid API error (${resp.status}) after ${sendDuration}ms:`, errText);
    throw new Error(`SendGrid error ${resp.status}: ${errText}`);
  }

  console.log(`[EMAIL API] SendGrid API success: ${resp.status} (${sendDuration}ms)`);
}

// Helper function to send SSE message
function sendSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('[EMAIL API] ===== Email sending request received =====');
  
  try {
    const body = (await req.json()) as SendEmailRequestBody;
    const { dancerId, dancerIds, from, to, preset, levelIds, fromEmail, customMessage, teacherIds } = body;
    const targetIds = Array.from(new Set((dancerIds && dancerIds.length ? dancerIds : (dancerId ? [dancerId] : []))));

    console.log('[EMAIL API] Request parameters:', {
      dancerIds: targetIds,
      dancerCount: targetIds.length,
      preset,
      from,
      to,
      levelIds: levelIds || [],
      levelCount: levelIds?.length || 0,
      fromEmail,
      hasCustomMessage: !!customMessage,
      customMessageLength: customMessage?.length || 0,
      teacherIds: teacherIds || [],
      teacherCount: teacherIds?.length || 0,
      selectedTeachersOnly: !!teacherIds && teacherIds.length > 0
    });

    if (!targetIds.length) {
      console.error('[EMAIL API] Error: No dancer IDs provided');
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
      console.log('[EMAIL API] Using preset date range:', { preset, fromDate, toDate, rangeLabel });
    } else if (from || to) {
      if (from) {
        fromDate = parseDateString(from);
      }
      if (to) {
        const [year, month, day] = to.split('-').map(Number);
        toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      }
      rangeLabel = `${from || ''}${from && to ? ' to ' : ''}${to || ''}` || 'selected dates';
      console.log('[EMAIL API] Using custom date range:', { from, to, fromDate, toDate, rangeLabel });
    } else {
      // Default to this week
      const { from: f, to: t } = getDateRangeFromPreset('this_week');
      fromDate = f;
      toDate = t;
      rangeLabel = 'this week';
      console.log('[EMAIL API] Using default date range (this week):', { fromDate, toDate });
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          console.log('[EMAIL API] Starting email sending process...');
          const dbQueryStart = Date.now();
          const dancers = await prisma.dancer.findMany({ where: { id: { in: targetIds } } });
          console.log(`[EMAIL API] Fetched ${dancers.length} dancers from database (${Date.now() - dbQueryStart}ms)`);
          
          type DancerType = { id: string; name: string; email: string | null };
          const dancerById = new Map<string, DancerType>(
            dancers.map((d: DancerType) => [d.id, d])
          );
          
          const dancersWithEmail = dancers.filter(d => d.email).length;
          const dancersWithoutEmail = dancers.length - dancersWithEmail;
          console.log(`[EMAIL API] Dancer email status: ${dancersWithEmail} with email, ${dancersWithoutEmail} without email`);
          
          const results: { id: string; status: 'sent' | 'skipped'; reason?: string }[] = [];
          
          // Send initial progress
          controller.enqueue(encoder.encode(sendSSEMessage({ 
            type: 'progress', 
            current: 0, 
            total: targetIds.length,
            message: 'Fetching schedules...'
          })));

          // OPTIMIZATION: Fetch all scheduled routines matching filters in ONE query instead of N queries
          const allScheduledRoutinesWhere: {
            routine?: {
              dancers?: { some: { id: { in: string[] } } };
              levelId?: { in: string[] };
            };
            date?: { gte?: Date; lte?: Date };
          } = {};

          // Build routine filter with both level and dancers if needed
          if ((levelIds && levelIds.length > 0) || targetIds.length > 0) {
            allScheduledRoutinesWhere.routine = {};
            
            // Apply level filter if provided
            if (levelIds && levelIds.length > 0) {
              allScheduledRoutinesWhere.routine.levelId = { in: levelIds };
            }
            
            // If we have target dancers, filter to only routines that include at least one of them
            if (targetIds.length > 0) {
              allScheduledRoutinesWhere.routine.dancers = { some: { id: { in: targetIds } } };
            }
          }

          // Apply date range filter
          if (fromDate || toDate) {
            allScheduledRoutinesWhere.date = {};
            if (fromDate) {
              allScheduledRoutinesWhere.date.gte = fromDate;
            }
            if (toDate) {
              allScheduledRoutinesWhere.date.lte = toDate;
            }
          }

          // Fetch all relevant scheduled routines in one query
          console.log('[EMAIL API] Fetching scheduled routines with filters:', {
            hasLevelFilter: !!(levelIds && levelIds.length > 0),
            hasDancerFilter: targetIds.length > 0,
            hasDateFilter: !!(fromDate || toDate),
            whereClause: JSON.stringify(allScheduledRoutinesWhere, null, 2)
          });
          
          const routinesQueryStart = Date.now();
          const allScheduledRoutines = await prisma.scheduledRoutine.findMany({
            where: allScheduledRoutinesWhere,
            include: { 
              routine: { 
                include: { 
                  teacher: true, 
                  genre: true, 
                  level: true, 
                  dancers: true 
                } 
              }, 
              room: true 
            },
            orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }]
          });
          console.log(`[EMAIL API] Fetched ${allScheduledRoutines.length} scheduled routines (${Date.now() - routinesQueryStart}ms)`);

          // Group scheduled routines by dancer ID for fast lookup
          const routinesByDancerId = new Map<string, typeof allScheduledRoutines>();
          for (const scheduledRoutine of allScheduledRoutines) {
            for (const dancer of scheduledRoutine.routine.dancers) {
              if (targetIds.includes(dancer.id)) {
                if (!routinesByDancerId.has(dancer.id)) {
                  routinesByDancerId.set(dancer.id, []);
                }
                routinesByDancerId.get(dancer.id)!.push(scheduledRoutine);
              }
            }
          }
          
          console.log('[EMAIL API] Grouped routines by dancer:', {
            totalDancersWithRoutines: routinesByDancerId.size,
            routinesPerDancer: Array.from(routinesByDancerId.entries()).map(([id, routines]) => ({
              dancerId: id,
              routineCount: routines.length
            }))
          });

          // Process dancers in parallel batches
          const BATCH_SIZE = 10; // Process 10 emails concurrently
          let processedCount = 0;
          console.log(`[EMAIL API] Starting dancer email processing: ${targetIds.length} dancers, batch size: ${BATCH_SIZE}`);

          const processDancerEmail = async (id: string): Promise<{ id: string; status: 'sent' | 'skipped'; reason?: string }> => {
            const emailStartTime = Date.now();
            const dancer = dancerById.get(id);
            if (!dancer) {
              console.warn(`[EMAIL API] Dancer ${id} not found in database`);
              return { id, status: 'skipped', reason: 'not found' };
            }
            
            const email = dancer.email;
            if (!email) {
              console.warn(`[EMAIL API] Dancer ${dancer.name} (${id}) has no email address`);
              return { id, status: 'skipped', reason: 'no email' };
            }

            // Get pre-fetched routines for this dancer
            const items = routinesByDancerId.get(id) || [];
            console.log(`[EMAIL API] Processing dancer ${dancer.name} (${id}): ${items.length} routines found`);

            const simplified = items.map((it: {
              date: Date;
              startMinutes: number;
              duration: number;
              routine: { songTitle: string; teacher: { name: string }; genre: { name: string } };
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
                genreName: it.routine.genre.name,
                roomName: it.room.name,
                teacherName: it.routine.teacher.name
              };
            });

            const subject = `Your rehearsal schedule for ${rangeLabel}`;
            const text = buildEmailText(dancer.name, simplified, rangeLabel, customMessage);

            try {
              console.log(`[EMAIL API] Sending email to dancer ${dancer.name} (${email})...`);
              await sendWithSendGrid(email, dancer.name, subject, text, fromEmail);
              const duration = Date.now() - emailStartTime;
              console.log(`[EMAIL API] ✓ Email sent successfully to ${dancer.name} (${duration}ms)`);
              return { id, status: 'sent' };
            } catch (e: unknown) {
              const errorMessage = e instanceof Error ? e.message : 'send failed';
              const duration = Date.now() - emailStartTime;
              console.error(`[EMAIL API] ✗ Failed to send email to ${dancer.name} (${email}): ${errorMessage} (${duration}ms)`, e);
              return { id, status: 'skipped', reason: errorMessage };
            }
          };

          // Process all dancers in batches with progress updates
          const totalBatches = Math.ceil(targetIds.length / BATCH_SIZE);
          console.log(`[EMAIL API] Processing ${targetIds.length} dancers in ${totalBatches} batches`);
          
          for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const batch = targetIds.slice(i, i + BATCH_SIZE);
            console.log(`[EMAIL API] Processing batch ${batchNumber}/${totalBatches} (${batch.length} dancers)...`);
            
            const batchStartTime = Date.now();
            const batchResults = await Promise.all(
              batch.map((id) => processDancerEmail(id))
            );
            const batchDuration = Date.now() - batchStartTime;
            
            const sentInBatch = batchResults.filter(r => r.status === 'sent').length;
            const skippedInBatch = batchResults.filter(r => r.status === 'skipped').length;
            console.log(`[EMAIL API] Batch ${batchNumber} completed: ${sentInBatch} sent, ${skippedInBatch} skipped (${batchDuration}ms)`);
            
            results.push(...batchResults);
            processedCount += batchResults.length;
            
            // Update progress after each batch
            controller.enqueue(encoder.encode(sendSSEMessage({ 
              type: 'progress', 
              current: processedCount, 
              total: targetIds.length,
              message: `Processed batch: ${sentInBatch} sent, ${skippedInBatch} skipped (${processedCount}/${targetIds.length} total)`
            })));
          }
          
          const dancerSummary = {
            total: results.length,
            sent: results.filter(r => r.status === 'sent').length,
            skipped: results.filter(r => r.status === 'skipped').length,
            skippedReasons: results
              .filter(r => r.status === 'skipped')
              .reduce((acc, r) => {
                const reason = r.reason || 'unknown';
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
          };
          console.log('[EMAIL API] Dancer email summary:', dancerSummary);

          // Send emails to teachers about routines
          const teacherResults: { teacherId: string; status: 'sent' | 'skipped'; reason?: string }[] = [];

          // OPTIMIZATION: Get unique teacher IDs from already-fetched routines (teachers who have routines with target dancers)
          let teacherIdsToEmail = Array.from(new Set(allScheduledRoutines.map(sr => sr.routine.teacherId)));
          console.log(`[EMAIL API] Found ${teacherIdsToEmail.length} unique teachers from routines`);
          
          // Filter by selected teacherIds if provided
          if (teacherIds && teacherIds.length > 0) {
            const beforeFilter = teacherIdsToEmail.length;
            teacherIdsToEmail = teacherIdsToEmail.filter(id => teacherIds.includes(id));
            console.log(`[EMAIL API] Filtered teachers: ${beforeFilter} -> ${teacherIdsToEmail.length} (user selected ${teacherIds.length} teachers)`);
          } else {
            console.log('[EMAIL API] No teacher filter applied, will email all teachers');
          }
          
          if (teacherIdsToEmail.length > 0) {
            console.log(`[EMAIL API] Starting teacher email processing: ${teacherIdsToEmail.length} teachers`);
            // Get all teachers with their email addresses
            const teacherQueryStart = Date.now();
            const teachers = await prisma.teacher.findMany({
              where: { id: { in: teacherIdsToEmail } }
            });
            console.log(`[EMAIL API] Fetched ${teachers.length} teachers from database (${Date.now() - teacherQueryStart}ms)`);
            
            const teachersWithEmail = teachers.filter(t => t.email).length;
            const teachersWithoutEmail = teachers.length - teachersWithEmail;
            console.log(`[EMAIL API] Teacher email status: ${teachersWithEmail} with email, ${teachersWithoutEmail} without email`);

            const teacherById = new Map(teachers.map(t => [t.id, t]));

            // OPTIMIZATION: Fetch ALL routines for these teachers in the date range (not just ones with target dancers)
            // Teachers should get their complete schedule, but we only email teachers who have routines with target dancers
            const teacherRoutinesWhere: {
              routine: { 
                teacherId: { in: string[] };
                levelId?: { in: string[] };
              };
              date?: { gte?: Date; lte?: Date };
            } = {
              routine: {
                teacherId: { in: teacherIdsToEmail }
              }
            };

            // Apply level filter if provided (to match what dancers received)
            if (levelIds && levelIds.length > 0) {
              teacherRoutinesWhere.routine.levelId = { in: levelIds };
            }

            // Apply date range filter
            if (fromDate || toDate) {
              teacherRoutinesWhere.date = {};
              if (fromDate) {
                teacherRoutinesWhere.date.gte = fromDate;
              }
              if (toDate) {
                teacherRoutinesWhere.date.lte = toDate;
              }
            }

            // Fetch all teacher routines in ONE query
            console.log('[EMAIL API] Fetching teacher routines with filters:', {
              teacherCount: teacherIdsToEmail.length,
              hasLevelFilter: !!(levelIds && levelIds.length > 0),
              hasDateFilter: !!(fromDate || toDate)
            });
            
            const teacherRoutinesQueryStart = Date.now();
            const allTeacherRoutines = await prisma.scheduledRoutine.findMany({
              where: teacherRoutinesWhere,
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
            console.log(`[EMAIL API] Fetched ${allTeacherRoutines.length} teacher routines (${Date.now() - teacherRoutinesQueryStart}ms)`);

            // OPTIMIZATION: Group scheduled routines by teacher ID
            const routinesByTeacherId = new Map<string, typeof allTeacherRoutines>();
            for (const scheduledRoutine of allTeacherRoutines) {
              const teacherId = scheduledRoutine.routine.teacherId;
              if (!routinesByTeacherId.has(teacherId)) {
                routinesByTeacherId.set(teacherId, []);
              }
              routinesByTeacherId.get(teacherId)!.push(scheduledRoutine);
            }
            
            console.log('[EMAIL API] Grouped routines by teacher:', {
              totalTeachersWithRoutines: routinesByTeacherId.size,
              routinesPerTeacher: Array.from(routinesByTeacherId.entries()).map(([id, routines]) => ({
                teacherId: id,
                routineCount: routines.length
              }))
            });

            // Process teachers in parallel batches
            const processTeacherEmail = async (teacherId: string): Promise<{ teacherId: string; status: 'sent' | 'skipped'; reason?: string }> => {
              const emailStartTime = Date.now();
              const teacher = teacherById.get(teacherId);
              if (!teacher || !teacher.email) {
                const reason = teacher ? 'no email' : 'not found';
                console.warn(`[EMAIL API] Teacher ${teacherId} skipped: ${reason}`);
                return { teacherId, status: 'skipped', reason };
              }

              // Get pre-fetched routines for this teacher
              const teacherItems = routinesByTeacherId.get(teacherId) || [];
              console.log(`[EMAIL API] Processing teacher ${teacher.name} (${teacherId}): ${teacherItems.length} routines found`);

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
                return { teacherId, status: 'sent' };
              } catch (e: unknown) {
                const errorMessage = e instanceof Error ? e.message : 'send failed';
                return { teacherId, status: 'skipped', reason: errorMessage };
              }
            };

            // Process all teachers in batches
            const totalTeacherBatches = Math.ceil(teacherIdsToEmail.length / BATCH_SIZE);
            console.log(`[EMAIL API] Processing ${teacherIdsToEmail.length} teachers in ${totalTeacherBatches} batches`);
            
            for (let i = 0; i < teacherIdsToEmail.length; i += BATCH_SIZE) {
              const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
              const batch = teacherIdsToEmail.slice(i, i + BATCH_SIZE);
              console.log(`[EMAIL API] Processing teacher batch ${batchNumber}/${totalTeacherBatches} (${batch.length} teachers)...`);
              
              const batchStartTime = Date.now();
              const batchResults = await Promise.all(
                batch.map((teacherId) => processTeacherEmail(teacherId))
              );
              const batchDuration = Date.now() - batchStartTime;
              
              const sentInBatch = batchResults.filter(r => r.status === 'sent').length;
              const skippedInBatch = batchResults.filter(r => r.status === 'skipped').length;
              console.log(`[EMAIL API] Teacher batch ${batchNumber} completed: ${sentInBatch} sent, ${skippedInBatch} skipped (${batchDuration}ms)`);
              
              teacherResults.push(...batchResults);
            }
            
            const teacherSummary = {
              total: teacherResults.length,
              sent: teacherResults.filter(r => r.status === 'sent').length,
              skipped: teacherResults.filter(r => r.status === 'skipped').length,
              skippedReasons: teacherResults
                .filter(r => r.status === 'skipped')
                .reduce((acc, r) => {
                  const reason = r.reason || 'unknown';
                  acc[reason] = (acc[reason] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
            };
            console.log('[EMAIL API] Teacher email summary:', teacherSummary);
          } else {
            console.log('[EMAIL API] No teachers to email');
          }

          // Send final result
          const sent = results.filter((r) => r.status === 'sent').length;
          const skipped = results.length - sent;
          const teacherSent = teacherResults.filter((r) => r.status === 'sent').length;
          const teacherSkipped = teacherResults.length - teacherSent;
          
          const totalDuration = Date.now() - startTime;
          const finalSummary = {
            totalDuration: `${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`,
            dancers: {
              total: results.length,
              sent,
              skipped,
              skippedReasons: results
                .filter(r => r.status === 'skipped')
                .reduce((acc, r) => {
                  const reason = r.reason || 'unknown';
                  acc[reason] = (acc[reason] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
            },
            teachers: {
              total: teacherResults.length,
              sent: teacherSent,
              skipped: teacherSkipped,
              skippedReasons: teacherResults
                .filter(r => r.status === 'skipped')
                .reduce((acc, r) => {
                  const reason = r.reason || 'unknown';
                  acc[reason] = (acc[reason] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
            }
          };
          
          console.log('[EMAIL API] ===== Final Summary =====');
          console.log('[EMAIL API]', JSON.stringify(finalSummary, null, 2));
          console.log('[EMAIL API] ===== Email sending completed =====');
          
          controller.enqueue(encoder.encode(sendSSEMessage({ 
            type: 'complete', 
            results, 
            teacherResults,
            sent,
            skipped,
            teacherSent,
            teacherSkipped
          })));
          
          controller.close();
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
          const totalDuration = Date.now() - startTime;
          console.error('[EMAIL API] ===== ERROR =====');
          console.error('[EMAIL API] Error occurred after', `${totalDuration}ms:`, errorMessage);
          console.error('[EMAIL API] Error details:', error);
          console.error('[EMAIL API] ====================');
          controller.enqueue(encoder.encode(sendSSEMessage({ 
            type: 'error', 
            message: errorMessage 
          })));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    const totalDuration = Date.now() - startTime;
    console.error('[EMAIL API] ===== FATAL ERROR =====');
    console.error('[EMAIL API] Request failed after', `${totalDuration}ms:`, errorMessage);
    console.error('[EMAIL API] Error details:', error);
    console.error('[EMAIL API] ========================');
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


