import { isHoliday } from '@holiday-jp/holiday_jp';

/** Saturday, Sunday or a Japanese public holiday (non-business day). */
export const isOffDay = (date: Date) => date.getDay() === 0 || date.getDay() === 6 || isHoliday(date);

/** FullCalendar class-name hook: non-business days are shaded (see .jd-offday in globals.css). */
export const offDayClassNames = (arg: { date: Date }) => (isOffDay(arg.date) ? ['jd-offday'] : []);
