type D1 = 0 | 1;
type D2 = D1 | 2;
type D3 = D2 | 3;
type D5 = D3 | 4 | 5;
type D6 = D5 | 6;
type D9 = D6 | 7 | 8 | 9;
//-------------------------------------------------------------
export type Hours = `${D9}` | `${D1}${D9}` | `2${D3}`;
export type TwoDigitsHours = `${D1}${D9}` | `2${D3}`;
export type Minutes = `${D9}` | `${D5}${D9}`;
export type TwoDigitsMinutes = `${D5}${D9}`;
export type Clock = `${Hours}:${Minutes}`;
export type TwoDigitsClock = `${TwoDigitsHours}:${TwoDigitsMinutes}`;
//-------------------------------------------------------------
export type DayOfWeek = `${D6}`;
//-------------------------------------------------------------
export type Cron = `${TwoDigitsMinutes} ${TwoDigitsHours} * * `;//TODO: what are stars?
export type CronDay = `${Cron}${DayOfWeek}`;//TODO: what are stars?

