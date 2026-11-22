import { NextRequest, NextResponse } from 'next/server';

export interface CalendarEventItem {
  id: string;
  summary: string;
  startISO: string;
  dateISO: string;
  dateLabel: string;
  timeLabel: string;
  location?: string;
}

function parseIcsDate(raw: string): Date | null {
  const clean = raw.trim().replace(/^.*:/, '');
  // Format: YYYYMMDD or YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!match) return null;
  const [, y, m, d, hh = '09', mm = '00', ss = '00', z] = match;
  if (z === 'Z') {
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
  }
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { icsUrl?: string };
    let url = (body.icsUrl ?? '').trim();
    if (!url) {
      return NextResponse.json({ error: '请先输入 Google Calendar iCal (.ics) 链接' }, { status: 400 });
    }
    if (url.startsWith('webcal://')) {
      url = `https://${url.slice('webcal://'.length)}`;
    }
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return NextResponse.json({ error: '无效的 iCal 链接格式' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { Accept: 'text/calendar, text/plain' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `无法拉取日历 (HTTP ${res.status})，请确认使用的是 Google Calendar 的 Secret address in iCal format 或公开 iCal 地址。` },
        { status: 400 }
      );
    }

    const text = await res.text();
    // Unfold RFC 5545 folded lines
    const unfolded = text.replace(/\r?\n[ \t]/g, '');
    const lines = unfolded.split(/\r?\n/);

    const nowMs = Date.now() - 86400000; // Include today's events
    const events: CalendarEventItem[] = [];
    let current: { uid?: string; summary?: string; dtstart?: string; location?: string } | null = null;

    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') {
        current = {};
      } else if (line === 'END:VEVENT' && current) {
        const dt = current.dtstart ? parseIcsDate(current.dtstart) : null;
        if (dt && dt.getTime() >= nowMs && current.summary) {
          events.push({
            id: current.uid || `gcal-${dt.getTime()}-${events.length}`,
            summary: unescapeIcsText(current.summary),
            startISO: dt.toISOString(),
            dateISO: dt.toISOString().slice(0, 10),
            dateLabel: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }),
            timeLabel: current.dtstart?.includes('T')
              ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              : 'All Day',
            location: current.location ? unescapeIcsText(current.location) : undefined,
          });
        }
        current = null;
      } else if (current) {
        if (line.startsWith('SUMMARY:')) current.summary = line.slice(8);
        else if (line.startsWith('UID:')) current.uid = line.slice(4);
        else if (line.startsWith('LOCATION:')) current.location = line.slice(9);
        else if (line.startsWith('DTSTART')) current.dtstart = line;
      }
    }

    events.sort((a, b) => a.startISO.localeCompare(b.startISO));
    return NextResponse.json({ events: events.slice(0, 24) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Calendar sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
