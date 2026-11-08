/**
 * Date-time values are timezone-less local strings (JST assumed):
 *   date only: "YYYY-MM-DD"
 *   date-time: "YYYY-MM-DDTHH:mm"
 * Both sort correctly as plain strings.
 */

export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const LOCAL_DATETIME_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3]):[0-5]\d)?$/;

/** Split "YYYY-MM-DD[THH:mm]" into date and time parts ('' when absent). */
export function splitLocalDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date, time = ''] = value.split('T');
  return { date, time };
}

/** Join date and time parts. A time without a date is dropped. Returns undefined when empty. */
export function joinLocalDateTime(date: string, time: string): string | undefined {
  if (!date) return undefined;
  return time ? `${date}T${time}` : date;
}

/** "YYYY-MM-DD HH:mm" / "YYYY-MM-DD" for display; '' when empty. */
export const formatLocalDateTime = (value: string | undefined) => (value ? value.replace('T', ' ') : '');

/** Today's date as "YYYY-MM-DD" in local time. */
export const todayLocalDate = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
