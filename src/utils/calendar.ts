/**
 * Google Calendar & iCal Integration Helper
 */

export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "14:30 - 15:00"
}

/**
 * Parses date string and time slot into ISO basic format for Google Calendar (YYYYMMDDTHHmmssZ)
 */
function parseDateTimeToGCal(dateStr: string, timeStr: string): { startGCal: string; endGCal: string } {
  try {
    const dateParts = dateStr.split('-');
    const year = dateParts[0];
    const month = dateParts[1]?.padStart(2, '0');
    const day = dateParts[2]?.padStart(2, '0');

    let startTime = '1000';
    let endTime = '1030';

    if (timeStr.includes('-')) {
      const parts = timeStr.split('-').map(p => p.trim());
      const s = parts[0].replace(':', '');
      const e = parts[1].replace(':', '');
      if (s) startTime = s.padStart(4, '0');
      if (e) endTime = e.padStart(4, '0');
    }

    const startGCal = `${year}${month}${day}T${startTime}00`;
    const endGCal = `${year}${month}${day}T${endTime}00`;

    return { startGCal, endGCal };
  } catch (e) {
    const cleanDate = dateStr.replace(/-/g, '');
    return {
      startGCal: `${cleanDate}T100000`,
      endGCal: `${cleanDate}T103000`
    };
  }
}

/**
 * Generates a direct Google Calendar web event URL
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const { startGCal, endGCal } = parseDateTimeToGCal(event.date, event.timeSlot);
  
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `🏠 Inspection: ${event.title}`,
    details: `${event.description}\n\nBooked via Dormiqa Student Housing Platform.`,
    location: event.location,
    dates: `${startGCal}/${endGCal}`
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Downloads an .ics calendar file for Apple Calendar, Outlook, Google Calendar desktop
 */
export function downloadIcsFile(event: CalendarEvent): void {
  const { startGCal, endGCal } = parseDateTimeToGCal(event.date, event.timeSlot);
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dormiqa Student Housing//Inspection Booking//EN',
    'BEGIN:VEVENT',
    `SUMMARY:Inspection: ${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    `DTSTART:${startGCal}`,
    `DTEND:${endGCal}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `inspection-${event.date}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
