export interface IcsOptions {
  summary: string;
  description?: string;
  start: Date; // UTC date
  end: Date;   // UTC date
  location?: string;
  organizer?: { name: string; email: string };
  attendees?: Array<{ name?: string; email: string; role?: string }>;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateUTC(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildIcs({ summary, description, start, end, location, organizer, attendees = [] }: IcsOptions) {
  const uid = `${Date.now()}@hireai.local`;
  const dtStart = formatDateUTC(start);
  const dtEnd = formatDateUTC(end);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HireAI//Recruiting//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(summary)}`,
  ];

  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (organizer) lines.push(`ORGANIZER;CN=${escapeText(organizer.name)}:mailto:${organizer.email}`);
  for (const a of attendees) {
    const role = a.role || "REQ-PARTICIPANT";
    const name = a.name ? `;CN=${escapeText(a.name)}` : "";
    lines.push(`ATTENDEE;ROLE=${role}${name}:mailto:${a.email}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
