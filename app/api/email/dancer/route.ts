import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// Configure route to allow longer execution time (for sending many emails)
export const maxDuration = 300; // 5 minutes (Vercel Pro plan allows up to 300s)
export const dynamic = "force-dynamic";

interface SendEmailRequestBody {
  dancerId?: string;
  dancerIds?: string[];
  from?: string; // ISO date string (YYYY-MM-DD)
  to?: string; // ISO date string (YYYY-MM-DD)
  preset?: "this_week" | "next_week" | "this_month";
  levelIds?: string[];
  fromEmail?: string;
  customMessage?: string;
  teacherIds?: string[]; // Optional: filter which teachers to send emails to
}

// Helper to parse YYYY-MM-DD to UTC Date (midnight UTC)
// This ensures dates are stored consistently regardless of server timezone
function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

// Helper to format Date to YYYY-MM-DD string (using UTC components)
// This ensures we get the calendar date, not affected by timezone
function formatDateString(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRangeFromPreset(
  preset: "this_week" | "next_week" | "this_month"
): { from: Date; to: Date } {
  const now = new Date();

  if (preset === "this_week") {
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

  if (preset === "next_week") {
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

function formatMinutesToHHMM(totalMinutes: number): {
  hour: number;
  minute: number;
} {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return { hour, minute };
}

function formatTime(hour: number, minute: number): string {
  const h = hour % 24;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const mm = String(minute).padStart(2, "0");
  return `${displayHour}:${mm} ${ampm}`;
}

// function dayNameFromDate(date: Date): string {
//   const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
//   return names[date.getDay()];
// }

function buildEmailText(
  dancerName: string,
  items: Array<{
    date: Date;
    startMinutes: number;
    duration: number;
    songTitle: string;
    genreName: string;
    roomName: string;
    teacherName: string;
  }>,
  rangeLabel: string,
  customMessage?: string
): string {
  const customMsg = customMessage?.trim()
    ? `\n${customMessage.trim()}\n\n`
    : "";

  if (items.length === 0) {
    return `Hi ${dancerName},${customMsg}Here's your rehearsal schedule for ${rangeLabel}:\n\nNo rehearsals scheduled in this period.\n\nSincerely, Performing Dance Arts.`;
  }

  const lines = items
    .map((it) => {
      const start = formatMinutesToHHMM(it.startMinutes);
      const endTotal = it.startMinutes + it.duration;
      const end = formatMinutesToHHMM(endTotal);
      const formattedDate = it.date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `${formattedDate} - ${formatTime(
        start.hour,
        start.minute
      )} to ${formatTime(end.hour, end.minute)}\n  Routine: ${
        it.songTitle
      }\n  Genre: ${it.genreName}\n  Room: ${it.roomName}\n  Teacher: ${
        it.teacherName
      }`;
    })
    .join("\n\n");

  return `Hi ${dancerName},${customMsg}Here's your rehearsal schedule for ${rangeLabel}:\n\n${lines}\n\nPlease arrive 10 minutes early for warm-up.\n\nSincerely, Performing Dance Arts.`;
}

function buildTeacherEmailText(
  teacherName: string,
  items: Array<{
    date: Date;
    startMinutes: number;
    duration: number;
    songTitle: string;
    roomName: string;
    dancerNames: string[];
  }>,
  rangeLabel: string,
  customMessage?: string
): string {
  const customMsg = customMessage?.trim()
    ? `\n${customMessage.trim()}\n\n`
    : "";

  if (items.length === 0) {
    return `Hi ${teacherName},${customMsg}Here are your rehearsal schedules for ${rangeLabel}:\n\nNo rehearsals scheduled in this period.\n\nSincerely, Performing Dance Arts.`;
  }

  const lines = items
    .map((it) => {
      const start = formatMinutesToHHMM(it.startMinutes);
      const endTotal = it.startMinutes + it.duration;
      const end = formatMinutesToHHMM(endTotal);
      const formattedDate = it.date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const dancersList =
        it.dancerNames.length > 0
          ? `\n  Dancers: ${it.dancerNames.join(", ")}`
          : "";
      return `${formattedDate} - ${formatTime(
        start.hour,
        start.minute
      )} to ${formatTime(end.hour, end.minute)}\n  Routine: ${
        it.songTitle
      }\n  Room: ${it.roomName}${dancersList}`;
    })
    .join("\n\n");

  return `Hi ${teacherName},${customMsg}Here are your rehearsal schedules for ${rangeLabel}:\n\n${lines}\n\nSincerely, Performing Dance Arts.`;
}

async function sendWithSendGrid(
  toEmail: string,
  toName: string,
  subject: string,
  text: string,
  customFromEmail?: string,
  retryCount: number = 0
): Promise<{ success: boolean; error?: string; duration: number }> {
  const sendStartTime = Date.now();
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000; // 1 second delay between retries

  const apiKey = process.env.SENDGRID_API_KEY;
  const defaultFromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromEmail = customFromEmail || defaultFromEmail;
  const fromName = process.env.SENDGRID_FROM_NAME || "Dance Studio";

  if (!apiKey || !fromEmail) {
    const error =
      "Missing SENDGRID_API_KEY or SENDGRID_FROM_EMAIL environment variables";
    console.error(
      `[EMAIL API] [${toName} <${toEmail}>] Configuration error: ${error}`
    );
    return { success: false, error, duration: Date.now() - sendStartTime };
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail, name: toName }],
        subject,
      },
    ],
    from: { email: fromEmail, name: fromName },
    content: [{ type: "text/plain", value: text }],
  };

  try {
    console.log(
      `[EMAIL API] [${toName} <${toEmail}>] Attempting to send email (attempt ${
        retryCount + 1
      }/${MAX_RETRIES + 1})...`
    );

    // Create abort controller for timeout (30 seconds per request)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let resp: Response;
    try {
      resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const sendDuration = Date.now() - sendStartTime;

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");

      // Retry on certain status codes
      if (
        retryCount < MAX_RETRIES &&
        (resp.status === 429 || resp.status >= 500)
      ) {
        console.warn(
          `[EMAIL API] [${toName} <${toEmail}>] SendGrid API error (${resp.status}), retrying in ${RETRY_DELAY}ms... Error: ${errText}`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return sendWithSendGrid(
          toEmail,
          toName,
          subject,
          text,
          customFromEmail,
          retryCount + 1
        );
      }

      const error = `SendGrid error ${resp.status}: ${errText}`;
      console.error(
        `[EMAIL API] [${toName} <${toEmail}>] Failed after ${sendDuration}ms: ${error}`
      );
      return { success: false, error, duration: sendDuration };
    }

    console.log(
      `[EMAIL API] [${toName} <${toEmail}>] ✓ Email sent successfully (${sendDuration}ms)`
    );
    return { success: true, duration: sendDuration };
  } catch (error: unknown) {
    const sendDuration = Date.now() - sendStartTime;
    let errorMessage = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for abort/timeout errors
      if (error.name === "AbortError" || errorMessage.includes("aborted")) {
        errorMessage = "Request timeout (30s)";
      }
    }

    // Retry on network errors or timeouts
    const isRetryable =
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("aborted") ||
      (error instanceof Error && error.name === "AbortError");

    if (retryCount < MAX_RETRIES && isRetryable) {
      console.warn(
        `[EMAIL API] [${toName} <${toEmail}>] Network/timeout error, retrying in ${RETRY_DELAY}ms... Error: ${errorMessage}`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return sendWithSendGrid(
        toEmail,
        toName,
        subject,
        text,
        customFromEmail,
        retryCount + 1
      );
    }

    console.error(
      `[EMAIL API] [${toName} <${toEmail}>] ✗ Failed after ${sendDuration}ms: ${errorMessage}`
    );
    return { success: false, error: errorMessage, duration: sendDuration };
  }
}

// Helper function to send SSE message
function sendSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log("[EMAIL API] ===== Email sending request received =====");

  try {
    const body = (await req.json()) as SendEmailRequestBody;
    const {
      dancerId,
      dancerIds,
      from,
      to,
      preset,
      levelIds,
      fromEmail,
      customMessage,
      teacherIds,
    } = body;
    const targetIds = Array.from(
      new Set(
        dancerIds && dancerIds.length ? dancerIds : dancerId ? [dancerId] : []
      )
    );

    console.log("[EMAIL API] Request parameters:", {
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
      selectedTeachersOnly: !!teacherIds && teacherIds.length > 0,
    });

    if (!targetIds.length) {
      console.error("[EMAIL API] Error: No dancer IDs provided");
      return NextResponse.json(
        { message: "dancerId or dancerIds is required" },
        { status: 400 }
      );
    }

    // Resolve date range
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    let rangeLabel = "";

    if (preset) {
      const { from: f, to: t } = getDateRangeFromPreset(preset);
      fromDate = f;
      toDate = t;
      rangeLabel =
        preset === "this_week"
          ? "this week"
          : preset === "next_week"
          ? "next week"
          : "this month";
      console.log("[EMAIL API] Using preset date range:", {
        preset,
        fromDate,
        toDate,
        rangeLabel,
      });
    } else if (from || to) {
      if (from) {
        fromDate = parseDateString(from);
      }
      if (to) {
        const [year, month, day] = to.split("-").map(Number);
        toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      }
      rangeLabel =
        `${from || ""}${from && to ? " to " : ""}${to || ""}` ||
        "selected dates";
      console.log("[EMAIL API] Using custom date range:", {
        from,
        to,
        fromDate,
        toDate,
        rangeLabel,
      });
    } else {
      // Default to this week
      const { from: f, to: t } = getDateRangeFromPreset("this_week");
      fromDate = f;
      toDate = t;
      rangeLabel = "this week";
      console.log("[EMAIL API] Using default date range (this week):", {
        fromDate,
        toDate,
      });
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          console.log("[EMAIL API] Starting email sending process...");
          const dbQueryStart = Date.now();
          const dancers = await prisma.dancer.findMany({
            where: { id: { in: targetIds } },
          });
          console.log(
            `[EMAIL API] Fetched ${dancers.length} dancers from database (${
              Date.now() - dbQueryStart
            }ms)`
          );

          type DancerType = { id: string; name: string; email: string | null };
          const dancerById = new Map<string, DancerType>(
            dancers.map((d: DancerType) => [d.id, d])
          );

          const dancersWithEmail = dancers.filter((d) => d.email).length;
          const dancersWithoutEmail = dancers.length - dancersWithEmail;
          console.log(
            `[EMAIL API] Dancer email status: ${dancersWithEmail} with email, ${dancersWithoutEmail} without email`
          );

          const results: {
            id: string;
            name: string;
            email: string | null;
            status: "sent" | "skipped";
            reason?: string;
            duration?: number;
          }[] = [];

          // Send initial progress
          controller.enqueue(
            encoder.encode(
              sendSSEMessage({
                type: "progress",
                current: 0,
                total: targetIds.length,
                message: "Fetching schedules...",
              })
            )
          );

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
              allScheduledRoutinesWhere.routine.dancers = {
                some: { id: { in: targetIds } },
              };
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
          console.log("[EMAIL API] Fetching scheduled routines with filters:", {
            hasLevelFilter: !!(levelIds && levelIds.length > 0),
            hasDancerFilter: targetIds.length > 0,
            hasDateFilter: !!(fromDate || toDate),
            whereClause: JSON.stringify(allScheduledRoutinesWhere, null, 2),
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
                  dancers: true,
                },
              },
              room: true,
            },
            orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
          });
          console.log(
            `[EMAIL API] Fetched ${
              allScheduledRoutines.length
            } scheduled routines (${Date.now() - routinesQueryStart}ms)`
          );

          // Group scheduled routines by dancer ID for fast lookup
          const routinesByDancerId = new Map<
            string,
            typeof allScheduledRoutines
          >();
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

          console.log("[EMAIL API] Grouped routines by dancer:", {
            totalDancersWithRoutines: routinesByDancerId.size,
            routinesPerDancer: Array.from(routinesByDancerId.entries()).map(
              ([id, routines]) => ({
                dancerId: id,
                routineCount: routines.length,
              })
            ),
          });

          // Process dancers in parallel batches
          // Reduced batch size to prevent rate limiting and timeout issues
          const BATCH_SIZE = 5; // Process 5 emails concurrently to avoid rate limits
          const BATCH_DELAY = 500; // 500ms delay between batches to prevent overwhelming SendGrid
          let processedCount = 0;
          console.log(
            `[EMAIL API] ===== Starting Dancer Email Processing =====`
          );
          console.log(
            `[EMAIL API] Total dancers: ${targetIds.length}, Batch size: ${BATCH_SIZE}, Batch delay: ${BATCH_DELAY}ms`
          );

          const processDancerEmail = async (
            id: string
          ): Promise<{
            id: string;
            name: string;
            email: string | null;
            status: "sent" | "skipped";
            reason?: string;
            duration?: number;
          }> => {
            const emailStartTime = Date.now();
            const dancer = dancerById.get(id);
            if (!dancer) {
              console.warn(`[EMAIL API] [DANCER ${id}] Not found in database`);
              return {
                id,
                name: "Unknown",
                email: null,
                status: "skipped",
                reason: "not found",
                duration: Date.now() - emailStartTime,
              };
            }

            const email = dancer.email;
            if (!email) {
              console.warn(
                `[EMAIL API] [DANCER ${dancer.name} (${id})] Skipped: No email address`
              );
              return {
                id,
                name: dancer.name,
                email: null,
                status: "skipped",
                reason: "no email",
                duration: Date.now() - emailStartTime,
              };
            }

            // Get pre-fetched routines for this dancer
            const items = routinesByDancerId.get(id) || [];
            console.log(
              `[EMAIL API] [DANCER ${dancer.name} <${email}>] Processing: ${items.length} routines found`
            );

            const simplified = items.map(
              (it: {
                date: Date;
                startMinutes: number;
                duration: number;
                routine: {
                  songTitle: string;
                  teacher: { name: string };
                  genre: { name: string };
                };
                room: { name: string };
              }) => {
                // Extract calendar date from UTC date stored in database
                // Database stores dates as UTC, so we use UTC components to get the calendar date
                const dateObj =
                  it.date instanceof Date ? it.date : new Date(it.date);
                const dateString = formatDateString(dateObj);
                const normalizedDate = parseDateString(dateString);

                return {
                  date: normalizedDate,
                  startMinutes: it.startMinutes,
                  duration: it.duration,
                  songTitle: it.routine.songTitle,
                  genreName: it.routine.genre.name,
                  roomName: it.room.name,
                  teacherName: it.routine.teacher.name,
                };
              }
            );

            const subject = `Your rehearsal schedule for ${rangeLabel}`;
            const text = buildEmailText(
              dancer.name,
              simplified,
              rangeLabel,
              customMessage
            );

            const result = await sendWithSendGrid(
              email,
              dancer.name,
              subject,
              text,
              fromEmail
            );
            const duration = Date.now() - emailStartTime;

            if (result.success) {
              return {
                id,
                name: dancer.name,
                email,
                status: "sent",
                duration: result.duration,
              };
            } else {
              return {
                id,
                name: dancer.name,
                email,
                status: "skipped",
                reason: result.error || "send failed",
                duration: result.duration,
              };
            }
          };

          // Process all dancers in batches with progress updates
          const totalBatches = Math.ceil(targetIds.length / BATCH_SIZE);
          console.log(
            `[EMAIL API] Processing ${targetIds.length} dancers in ${totalBatches} batches`
          );

          for (let i = 0; i < targetIds.length; i += BATCH_SIZE) {
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const batch = targetIds.slice(i, i + BATCH_SIZE);
            const batchStartTime = Date.now();

            console.log(
              `[EMAIL API] ===== Dancer Batch ${batchNumber}/${totalBatches} =====`
            );
            console.log(
              `[EMAIL API] Processing ${batch.length} dancers in this batch...`
            );

            const batchResults = await Promise.all(
              batch.map((id) => processDancerEmail(id))
            );
            const batchDuration = Date.now() - batchStartTime;

            const sentInBatch = batchResults.filter(
              (r) => r.status === "sent"
            ).length;
            const skippedInBatch = batchResults.filter(
              (r) => r.status === "skipped"
            ).length;

            // Detailed batch logging
            console.log(`[EMAIL API] Batch ${batchNumber} Summary:`);
            console.log(`[EMAIL API]   - Total: ${batchResults.length}`);
            console.log(`[EMAIL API]   - Sent: ${sentInBatch}`);
            console.log(`[EMAIL API]   - Skipped: ${skippedInBatch}`);
            console.log(
              `[EMAIL API]   - Duration: ${batchDuration}ms (${(
                batchDuration / 1000
              ).toFixed(2)}s)`
            );

            // Log each result in batch
            batchResults.forEach((result) => {
              if (result.status === "sent") {
                console.log(
                  `[EMAIL API]   ✓ ${result.name} <${result.email}> - Sent (${result.duration}ms)`
                );
              } else {
                console.log(
                  `[EMAIL API]   ✗ ${result.name} <${
                    result.email || "N/A"
                  }> - Skipped: ${result.reason || "unknown"} (${
                    result.duration
                  }ms)`
                );
              }
            });

            results.push(...batchResults);
            processedCount += batchResults.length;

            // Update progress after each batch
            controller.enqueue(
              encoder.encode(
                sendSSEMessage({
                  type: "progress",
                  current: processedCount,
                  total: targetIds.length,
                  message: `Processed batch ${batchNumber}/${totalBatches}: ${sentInBatch} sent, ${skippedInBatch} skipped (${processedCount}/${targetIds.length} total)`,
                })
              )
            );

            // Add delay between batches to prevent rate limiting (except for last batch)
            if (i + BATCH_SIZE < targetIds.length) {
              console.log(
                `[EMAIL API] Waiting ${BATCH_DELAY}ms before next batch...`
              );
              await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
            }
          }

          // Comprehensive dancer summary with detailed logging
          const dancerSent = results.filter((r) => r.status === "sent");
          const dancerSkipped = results.filter((r) => r.status === "skipped");

          const dancerSummary = {
            total: results.length,
            sent: dancerSent.length,
            skipped: dancerSkipped.length,
            skippedReasons: dancerSkipped.reduce((acc, r) => {
              const reason = r.reason || "unknown";
              acc[reason] = (acc[reason] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          };

          console.log("[EMAIL API] ===== Dancer Email Summary =====");
          console.log("[EMAIL API]", JSON.stringify(dancerSummary, null, 2));
          console.log("[EMAIL API] Successfully sent to dancers:");
          dancerSent.forEach((r) => {
            console.log(`[EMAIL API]   ✓ ${r.name} <${r.email}>`);
          });
          if (dancerSkipped.length > 0) {
            console.log("[EMAIL API] Skipped dancers:");
            dancerSkipped.forEach((r) => {
              console.log(
                `[EMAIL API]   ✗ ${r.name} <${r.email || "N/A"}> - Reason: ${
                  r.reason || "unknown"
                }`
              );
            });
          }
          console.log("[EMAIL API] ====================================");

          // Send emails to teachers about routines
          const teacherResults: {
            teacherId: string;
            name: string;
            email: string | null;
            status: "sent" | "skipped";
            reason?: string;
            duration?: number;
          }[] = [];

          // OPTIMIZATION: Get unique teacher IDs from already-fetched routines (teachers who have routines with target dancers)
          let teacherIdsToEmail = Array.from(
            new Set(allScheduledRoutines.map((sr) => sr.routine.teacherId))
          );
          console.log(
            `[EMAIL API] Found ${teacherIdsToEmail.length} unique teachers from routines`
          );

          // Filter by selected teacherIds if provided
          if (teacherIds && teacherIds.length > 0) {
            const beforeFilter = teacherIdsToEmail.length;
            teacherIdsToEmail = teacherIdsToEmail.filter((id) =>
              teacherIds.includes(id)
            );
            console.log(
              `[EMAIL API] Filtered teachers: ${beforeFilter} -> ${teacherIdsToEmail.length} (user selected ${teacherIds.length} teachers)`
            );
          } else {
            console.log(
              "[EMAIL API] No teacher filter applied, will email all teachers"
            );
          }

          if (teacherIdsToEmail.length > 0) {
            console.log(
              `[EMAIL API] Starting teacher email processing: ${teacherIdsToEmail.length} teachers`
            );
            // Get all teachers with their email addresses
            const teacherQueryStart = Date.now();
            const teachers = await prisma.teacher.findMany({
              where: { id: { in: teacherIdsToEmail } },
            });
            console.log(
              `[EMAIL API] Fetched ${teachers.length} teachers from database (${
                Date.now() - teacherQueryStart
              }ms)`
            );

            const teachersWithEmail = teachers.filter((t) => t.email).length;
            const teachersWithoutEmail = teachers.length - teachersWithEmail;
            console.log(
              `[EMAIL API] Teacher email status: ${teachersWithEmail} with email, ${teachersWithoutEmail} without email`
            );

            const teacherById = new Map(teachers.map((t) => [t.id, t]));

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
                teacherId: { in: teacherIdsToEmail },
              },
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
            console.log("[EMAIL API] Fetching teacher routines with filters:", {
              teacherCount: teacherIdsToEmail.length,
              hasLevelFilter: !!(levelIds && levelIds.length > 0),
              hasDateFilter: !!(fromDate || toDate),
            });

            const teacherRoutinesQueryStart = Date.now();
            const allTeacherRoutines = await prisma.scheduledRoutine.findMany({
              where: teacherRoutinesWhere,
              include: {
                routine: {
                  include: {
                    teacher: true,
                    dancers: true,
                  },
                },
                room: true,
              },
              orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
            });
            console.log(
              `[EMAIL API] Fetched ${
                allTeacherRoutines.length
              } teacher routines (${Date.now() - teacherRoutinesQueryStart}ms)`
            );

            // OPTIMIZATION: Group scheduled routines by teacher ID
            const routinesByTeacherId = new Map<
              string,
              typeof allTeacherRoutines
            >();
            for (const scheduledRoutine of allTeacherRoutines) {
              const teacherId = scheduledRoutine.routine.teacherId;
              if (!routinesByTeacherId.has(teacherId)) {
                routinesByTeacherId.set(teacherId, []);
              }
              routinesByTeacherId.get(teacherId)!.push(scheduledRoutine);
            }

            console.log("[EMAIL API] Grouped routines by teacher:", {
              totalTeachersWithRoutines: routinesByTeacherId.size,
              routinesPerTeacher: Array.from(routinesByTeacherId.entries()).map(
                ([id, routines]) => ({
                  teacherId: id,
                  routineCount: routines.length,
                })
              ),
            });

            // Process teachers in parallel batches
            const processTeacherEmail = async (
              teacherId: string
            ): Promise<{
              teacherId: string;
              name: string;
              email: string | null;
              status: "sent" | "skipped";
              reason?: string;
              duration?: number;
            }> => {
              const emailStartTime = Date.now();
              const teacher = teacherById.get(teacherId);
              if (!teacher || !teacher.email) {
                const reason = teacher ? "no email" : "not found";
                console.warn(
                  `[EMAIL API] [TEACHER ${teacherId}] Skipped: ${reason}`
                );
                return {
                  teacherId,
                  name: teacher?.name || "Unknown",
                  email: teacher?.email || null,
                  status: "skipped",
                  reason,
                  duration: Date.now() - emailStartTime,
                };
              }

              // Get pre-fetched routines for this teacher
              const teacherItems = routinesByTeacherId.get(teacherId) || [];
              console.log(
                `[EMAIL API] [TEACHER ${teacher.name} <${teacher.email}>] Processing: ${teacherItems.length} routines found`
              );

              const teacherSimplified = teacherItems.map(
                (it: {
                  date: Date;
                  startMinutes: number;
                  duration: number;
                  routine: {
                    songTitle: string;
                    dancers: Array<{ name: string }>;
                  };
                  room: { name: string };
                }) => {
                  // Extract calendar date from UTC date stored in database
                  // Database stores dates as UTC, so we use UTC components to get the calendar date
                  const dateObj =
                    it.date instanceof Date ? it.date : new Date(it.date);
                  const dateString = formatDateString(dateObj);
                  const normalizedDate = parseDateString(dateString);

                  return {
                    date: normalizedDate,
                    startMinutes: it.startMinutes,
                    duration: it.duration,
                    songTitle: it.routine.songTitle,
                    roomName: it.room.name,
                    dancerNames: it.routine.dancers.map((d) => d.name),
                  };
                }
              );

              const teacherSubject = `Your rehearsal schedule for ${rangeLabel}`;
              const teacherText = buildTeacherEmailText(
                teacher.name,
                teacherSimplified,
                rangeLabel,
                customMessage
              );

              const result = await sendWithSendGrid(
                teacher.email,
                teacher.name,
                teacherSubject,
                teacherText,
                fromEmail
              );
              const duration = Date.now() - emailStartTime;

              if (result.success) {
                return {
                  teacherId,
                  name: teacher.name,
                  email: teacher.email,
                  status: "sent",
                  duration: result.duration,
                };
              } else {
                return {
                  teacherId,
                  name: teacher.name,
                  email: teacher.email,
                  status: "skipped",
                  reason: result.error || "send failed",
                  duration: result.duration,
                };
              }
            };

            // Process all teachers in batches
            const totalTeacherBatches = Math.ceil(
              teacherIdsToEmail.length / BATCH_SIZE
            );
            console.log(
              `[EMAIL API] ===== Starting Teacher Email Processing =====`
            );
            console.log(
              `[EMAIL API] Total teachers: ${teacherIdsToEmail.length}, Batch size: ${BATCH_SIZE}, Batch delay: ${BATCH_DELAY}ms`
            );

            for (let i = 0; i < teacherIdsToEmail.length; i += BATCH_SIZE) {
              const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
              const batch = teacherIdsToEmail.slice(i, i + BATCH_SIZE);
              const batchStartTime = Date.now();

              console.log(
                `[EMAIL API] ===== Teacher Batch ${batchNumber}/${totalTeacherBatches} =====`
              );
              console.log(
                `[EMAIL API] Processing ${batch.length} teachers in this batch...`
              );

              const batchResults = await Promise.all(
                batch.map((teacherId) => processTeacherEmail(teacherId))
              );
              const batchDuration = Date.now() - batchStartTime;

              const sentInBatch = batchResults.filter(
                (r) => r.status === "sent"
              ).length;
              const skippedInBatch = batchResults.filter(
                (r) => r.status === "skipped"
              ).length;

              // Detailed batch logging
              console.log(`[EMAIL API] Teacher Batch ${batchNumber} Summary:`);
              console.log(`[EMAIL API]   - Total: ${batchResults.length}`);
              console.log(`[EMAIL API]   - Sent: ${sentInBatch}`);
              console.log(`[EMAIL API]   - Skipped: ${skippedInBatch}`);
              console.log(
                `[EMAIL API]   - Duration: ${batchDuration}ms (${(
                  batchDuration / 1000
                ).toFixed(2)}s)`
              );

              // Log each result in batch
              batchResults.forEach((result) => {
                if (result.status === "sent") {
                  console.log(
                    `[EMAIL API]   ✓ ${result.name} <${result.email}> - Sent (${result.duration}ms)`
                  );
                } else {
                  console.log(
                    `[EMAIL API]   ✗ ${result.name} <${
                      result.email || "N/A"
                    }> - Skipped: ${result.reason || "unknown"} (${
                      result.duration
                    }ms)`
                  );
                }
              });

              teacherResults.push(...batchResults);

              // Add delay between batches to prevent rate limiting (except for last batch)
              if (i + BATCH_SIZE < teacherIdsToEmail.length) {
                console.log(
                  `[EMAIL API] Waiting ${BATCH_DELAY}ms before next batch...`
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, BATCH_DELAY)
                );
              }
            }

            // Comprehensive teacher summary with detailed logging
            const teacherSent = teacherResults.filter(
              (r) => r.status === "sent"
            );
            const teacherSkipped = teacherResults.filter(
              (r) => r.status === "skipped"
            );

            const teacherSummary = {
              total: teacherResults.length,
              sent: teacherSent.length,
              skipped: teacherSkipped.length,
              skippedReasons: teacherSkipped.reduce((acc, r) => {
                const reason = r.reason || "unknown";
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
              }, {} as Record<string, number>),
            };

            console.log("[EMAIL API] ===== Teacher Email Summary =====");
            console.log("[EMAIL API]", JSON.stringify(teacherSummary, null, 2));
            console.log("[EMAIL API] Successfully sent to teachers:");
            teacherSent.forEach((r) => {
              console.log(`[EMAIL API]   ✓ ${r.name} <${r.email}>`);
            });
            if (teacherSkipped.length > 0) {
              console.log("[EMAIL API] Skipped teachers:");
              teacherSkipped.forEach((r) => {
                console.log(
                  `[EMAIL API]   ✗ ${r.name} <${r.email || "N/A"}> - Reason: ${
                    r.reason || "unknown"
                  }`
                );
              });
            }
            console.log("[EMAIL API] ====================================");
          } else {
            console.log("[EMAIL API] No teachers to email");
          }

          // Send final result with comprehensive logging
          const sent = results.filter((r) => r.status === "sent").length;
          const skipped = results.length - sent;
          const teacherSent = teacherResults.filter(
            (r) => r.status === "sent"
          ).length;
          const teacherSkipped = teacherResults.length - teacherSent;

          const totalDuration = Date.now() - startTime;

          // Build detailed recipient lists
          const successfulDancers = results
            .filter((r) => r.status === "sent")
            .map((r) => ({ name: r.name, email: r.email }));
          const successfulTeachers = teacherResults
            .filter((r) => r.status === "sent")
            .map((r) => ({ name: r.name, email: r.email }));

          const finalSummary = {
            totalDuration: `${totalDuration}ms (${(
              totalDuration / 1000
            ).toFixed(2)}s)`,
            dancers: {
              total: results.length,
              sent,
              skipped,
              successfulRecipients: successfulDancers,
              skippedReasons: results
                .filter((r) => r.status === "skipped")
                .reduce((acc, r) => {
                  const reason = r.reason || "unknown";
                  acc[reason] = (acc[reason] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
            },
            teachers: {
              total: teacherResults.length,
              sent: teacherSent,
              skipped: teacherSkipped,
              successfulRecipients: successfulTeachers,
              skippedReasons: teacherResults
                .filter((r) => r.status === "skipped")
                .reduce((acc, r) => {
                  const reason = r.reason || "unknown";
                  acc[reason] = (acc[reason] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
            },
          };

          console.log(
            "[EMAIL API] ============================================"
          );
          console.log("[EMAIL API] ===== FINAL EMAIL SENDING SUMMARY =====");
          console.log(
            "[EMAIL API] ============================================"
          );
          console.log(
            `[EMAIL API] Total Duration: ${(totalDuration / 1000).toFixed(2)}s`
          );
          console.log(`[EMAIL API] `);
          console.log(`[EMAIL API] DANCERS:`);
          console.log(`[EMAIL API]   Total: ${results.length}`);
          console.log(`[EMAIL API]   Successfully Sent: ${sent}`);
          console.log(`[EMAIL API]   Skipped: ${skipped}`);
          if (successfulDancers.length > 0) {
            console.log(`[EMAIL API]   Recipients who received emails:`);
            successfulDancers.forEach((d) => {
              console.log(`[EMAIL API]     ✓ ${d.name} <${d.email}>`);
            });
          }
          if (skipped > 0) {
            console.log(
              `[EMAIL API]   Skipped reasons:`,
              finalSummary.dancers.skippedReasons
            );
          }
          console.log(`[EMAIL API] `);
          console.log(`[EMAIL API] TEACHERS:`);
          console.log(`[EMAIL API]   Total: ${teacherResults.length}`);
          console.log(`[EMAIL API]   Successfully Sent: ${teacherSent}`);
          console.log(`[EMAIL API]   Skipped: ${teacherSkipped}`);
          if (successfulTeachers.length > 0) {
            console.log(`[EMAIL API]   Recipients who received emails:`);
            successfulTeachers.forEach((t) => {
              console.log(`[EMAIL API]     ✓ ${t.name} <${t.email}>`);
            });
          }
          if (teacherSkipped > 0) {
            console.log(
              `[EMAIL API]   Skipped reasons:`,
              finalSummary.teachers.skippedReasons
            );
          }
          console.log(
            "[EMAIL API] ============================================"
          );
          console.log("[EMAIL API] ===== Email sending completed =====");
          console.log(
            "[EMAIL API] ============================================"
          );

          // Also log JSON summary for easy parsing
          console.log(
            "[EMAIL API] JSON Summary:",
            JSON.stringify(finalSummary, null, 2)
          );

          controller.enqueue(
            encoder.encode(
              sendSSEMessage({
                type: "complete",
                results,
                teacherResults,
                sent,
                skipped,
                teacherSent,
                teacherSkipped,
              })
            )
          );

          controller.close();
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to send email";
          const totalDuration = Date.now() - startTime;
          console.error("[EMAIL API] ===== ERROR =====");
          console.error(
            "[EMAIL API] Error occurred after",
            `${totalDuration}ms:`,
            errorMessage
          );
          console.error("[EMAIL API] Error details:", error);
          console.error("[EMAIL API] ====================");
          controller.enqueue(
            encoder.encode(
              sendSSEMessage({
                type: "error",
                message: errorMessage,
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    const totalDuration = Date.now() - startTime;
    console.error("[EMAIL API] ===== FATAL ERROR =====");
    console.error(
      "[EMAIL API] Request failed after",
      `${totalDuration}ms:`,
      errorMessage
    );
    console.error("[EMAIL API] Error details:", error);
    console.error("[EMAIL API] ========================");
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
