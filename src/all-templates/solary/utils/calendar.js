/* ============================================================
   calendar.js — .ics + Google Calendar link generators
   ============================================================ */

function fmt(d) {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    x.getUTCFullYear() +
    pad(x.getUTCMonth() + 1) +
    pad(x.getUTCDate()) +
    "T" +
    pad(x.getUTCHours()) +
    pad(x.getUTCMinutes()) +
    "00Z"
  );
}

function esc(s) {
  return String(s || "").replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

export function makeIcs({ title, description = "", location = "", start, end }) {
  const dtStart = fmt(start);
  const dtEnd = fmt(end || new Date(new Date(start).getTime() + 6 * 3600e3));
  const uid = `${Date.now()}@galactic-wedding`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Galactic Wedding//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    `LOCATION:${esc(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcs(opts) {
  const ics = makeIcs(opts);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(opts.title || "wedding").replace(/\W+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalUrl({ title, description = "", location = "", start, end }) {
  const s = fmt(start);
  const e = fmt(end || new Date(new Date(start).getTime() + 6 * 3600e3));
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${s}/${e}`,
    details: description,
    location,
  });
  return "https://www.google.com/calendar/render?" + p.toString();
}
