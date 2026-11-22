import { NextRequest, NextResponse } from 'next/server';

export interface CalendarEventItem {
  id: string;
  summary: string;
  startISO: string;
  endISO: string;
  dateISO: string;
  dateLabel: string;
  timeLabel: string;
  timeRangeLabel: string;
  startMinutes: number;
  durationMinutes: number;
  isAllDay: boolean;
  location?: string;
}

interface ParsedDateResult {
  date: Date;
  isAllDay: boolean;
  localDateISO: string;
  localMinutes: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function formatPacificParts(d: Date): { dateISO: string; minutes: number; timeStr: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  let hh = Number(get('hour'));
  if (hh === 24) hh = 0;
  const mm = Number(get('minute'));
  const ampm = hh >= 12 ? 'pm' : 'am';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const timeStr = mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2, '0')}${ampm}`;
  return {
    dateISO: `${y}-${m}-${day}`,
    minutes: hh * 60 + mm,
    timeStr,
  };
}

function parseIcsDate(rawLine: string): ParsedDateResult | null {
  const colonIdx = rawLine.indexOf(':');
  if (colonIdx === -1) return null;
  const meta = rawLine.slice(0, colonIdx);
  const val = rawLine.slice(colonIdx + 1).trim();

  const match = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;
  const [, y, m, d, hh, mm, ss, z] = match;

  if (!hh) {
    // All-day YYYYMMDD
    const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
    return {
      date: dt,
      isAllDay: true,
      localDateISO: `${y}-${m}-${d}`,
      localMinutes: 0,
    };
  }

  let dt: Date;
  if (z === 'Z') {
    dt = new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss))
    );
  } else if (meta.includes('America/Los_Angeles') || !meta.includes('TZID=')) {
    // Approximate local Pacific time reliably using UTC offset check
    const approx = new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) + 8, Number(mm), Number(ss))
    );
    const pac = formatPacificParts(approx);
    const desiredMin = Number(hh) * 60 + Number(mm);
    const diffMin = desiredMin - pac.minutes;
    dt = new Date(approx.getTime() + diffMin * 60000);
  } else {
    dt = new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) + 8, Number(mm), Number(ss))
    );
  }

  const pac = formatPacificParts(dt);
  return {
    date: dt,
    isAllDay: false,
    localDateISO: pac.dateISO,
    localMinutes: pac.minutes,
  };
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseRRule(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  raw.split(';').forEach((part) => {
    const [k, v] = part.split('=');
    if (k && v) out[k.trim().toUpperCase()] = v.trim().toUpperCase();
  });
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { icsUrl?: string };
    const rawUrls = (body.icsUrl ?? '')
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawUrls.length === 0) {
      return NextResponse.json(
        { error: '请先输入 Google Calendar iCal (.ics) 链接' },
        { status: 400 }
      );
    }

    const windowStartMs = Date.now() - 10 * 86400000;
    const windowEndMs = Date.now() + 45 * 86400000;
    const events: CalendarEventItem[] = [];

    for (const inputUrl of rawUrls.slice(0, 4)) {
      let url = inputUrl;
      if (url.startsWith('webcal://')) {
        url = `https://${url.slice('webcal://'.length)}`;
      }
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        continue;
      }

      const res = await fetch(url, {
        headers: { Accept: 'text/calendar, text/plain' },
        cache: 'no-store',
      });
      if (!res.ok) {
        return NextResponse.json(
          {
            error: `无法拉取日历 (HTTP ${res.status})，请确认使用的是 Google Calendar 的 Secret address in iCal format。`,
          },
          { status: 400 }
        );
      }

      const text = await res.text();
      const unfolded = text.replace(/\r?\n[ \t]/g, '');
      const lines = unfolded.split(/\r?\n/);

      let current: {
        uid?: string;
        summary?: string;
        dtstart?: string;
        dtend?: string;
        rrule?: string;
        exdates: string[];
        location?: string;
      } | null = null;

      for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
          current = { exdates: [] };
        } else if (line === 'END:VEVENT' && current) {
          const startParsed = current.dtstart ? parseIcsDate(current.dtstart) : null;
          if (startParsed && current.summary) {
            const endParsed = current.dtend ? parseIcsDate(current.dtend) : null;
            const durationMs = endParsed
              ? Math.max(
                  startParsed.isAllDay ? 86400000 : 1800000,
                  endParsed.date.getTime() - startParsed.date.getTime()
                )
              : startParsed.isAllDay
                ? 86400000
                : 3600000;

            const summaryClean = unescapeIcsText(current.summary);
            const locationClean = current.location ? unescapeIcsText(current.location) : undefined;

            const pushOccurrence = (occStart: Date, suffix: string) => {
              const occEnd = new Date(occStart.getTime() + durationMs);
              const pacStart = formatPacificParts(occStart);
              const pacEnd = formatPacificParts(occEnd);

              if (startParsed.isAllDay) {
                // Multi-day all-day events (e.g. Black Friday Mon-Thu)
                const numDays = Math.min(7, Math.max(1, Math.round(durationMs / 86400000)));
                for (let dIdx = 0; dIdx < numDays; dIdx++) {
                  const dayDt = new Date(occStart.getTime() + dIdx * 86400000);
                  if (dayDt.getTime() < windowStartMs || dayDt.getTime() > windowEndMs) continue;
                  const iso = dayDt.toISOString().slice(0, 10);
                  if (current!.exdates.includes(iso)) continue;
                  events.push({
                    id: `${current!.uid || summaryClean}-${suffix}-d${dIdx}`,
                    summary: summaryClean,
                    startISO: dayDt.toISOString(),
                    endISO: dayDt.toISOString(),
                    dateISO: iso,
                    dateLabel: dayDt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    }),
                    timeLabel: 'All Day',
                    timeRangeLabel: 'All Day',
                    startMinutes: 0,
                    durationMinutes: 60,
                    isAllDay: true,
                    location: locationClean,
                  });
                }
                return;
              }

              if (occStart.getTime() < windowStartMs || occStart.getTime() > windowEndMs) return;
              if (current!.exdates.includes(pacStart.dateISO)) return;

              const durMin = Math.max(30, Math.round(durationMs / 60000));
              events.push({
                id: `${current!.uid || summaryClean}-${suffix}`,
                summary: summaryClean,
                startISO: occStart.toISOString(),
                endISO: occEnd.toISOString(),
                dateISO: pacStart.dateISO,
                dateLabel: occStart.toLocaleDateString('en-US', {
                  timeZone: 'America/Los_Angeles',
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                }),
                timeLabel: pacStart.timeStr,
                timeRangeLabel: `${pacStart.timeStr} – ${pacEnd.timeStr}`,
                startMinutes: pacStart.minutes,
                durationMinutes: durMin,
                isAllDay: false,
                location: locationClean,
              });
            };

            if (!current.rrule) {
              pushOccurrence(startParsed.date, 'single');
            } else {
              const rule = parseRRule(current.rrule);
              const freq = rule.FREQ;
              const interval = Math.max(1, Number(rule.INTERVAL ?? '1') || 1);
              const untilParsed = rule.UNTIL ? parseIcsDate(`DTSTART:${rule.UNTIL}`) : null;
              const untilMs = untilParsed ? untilParsed.date.getTime() : windowEndMs;
              const maxEndMs = Math.min(windowEndMs, untilMs);
              const maxCount = rule.COUNT ? Number(rule.COUNT) : 500;
              const byDays = rule.BYDAY
                ? rule.BYDAY.split(',')
                    .map((d) => WEEKDAY_MAP[d.slice(-2)])
                    .filter((n) => n !== undefined)
                : null;

              if (freq === 'DAILY' || freq === 'WEEKLY') {
                const startMs = startParsed.date.getTime();
                // Jump close to windowStartMs to avoid iterating years of past occurrences
                let stepIdx = 0;
                const stepDays = freq === 'DAILY' ? interval : 1;
                if (startMs < windowStartMs && freq === 'DAILY') {
                  stepIdx = Math.max(
                    0,
                    Math.floor((windowStartMs - startMs) / (stepDays * 86400000)) - 1
                  );
                } else if (startMs < windowStartMs && freq === 'WEEKLY') {
                  stepIdx = Math.max(0, Math.floor((windowStartMs - startMs) / 86400000) - 7);
                }

                let emitted = 0;
                for (let i = stepIdx; i < stepIdx + 120 && emitted < maxCount; i++) {
                  const occ = new Date(startMs + i * (freq === 'DAILY' ? interval : 1) * 86400000);
                  if (occ.getTime() > maxEndMs) break;
                  if (freq === 'WEEKLY') {
                    const weeksSinceStart = Math.floor((occ.getTime() - startMs) / (7 * 86400000));
                    if (weeksSinceStart % interval !== 0) continue;
                    if (byDays && !byDays.includes(occ.getUTCDay())) continue;
                    if (!byDays && occ.getUTCDay() !== startParsed.date.getUTCDay()) continue;
                  }
                  pushOccurrence(occ, `r${i}`);
                  emitted++;
                }
              } else {
                // Fallback: emit base occurrence if in window
                pushOccurrence(startParsed.date, 'r0');
              }
            }
          }
          current = null;
        } else if (current) {
          if (line.startsWith('SUMMARY:')) current.summary = line.slice(8);
          else if (line.startsWith('UID:')) current.uid = line.slice(4);
          else if (line.startsWith('LOCATION:')) current.location = line.slice(9);
          else if (line.startsWith('DTSTART')) current.dtstart = line;
          else if (line.startsWith('DTEND')) current.dtend = line;
          else if (line.startsWith('RRULE:')) current.rrule = line.slice(6);
          else if (line.startsWith('EXDATE')) {
            const ex = parseIcsDate(line);
            if (ex) current.exdates.push(ex.localDateISO);
          }
        }
      }
    }

    events.sort((a, b) => a.startISO.localeCompare(b.startISO));
    return NextResponse.json({ events: events.slice(0, 220) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
