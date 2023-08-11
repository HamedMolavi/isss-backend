import { Clock, Cron, CronDay, DateType, DayOfWeek, Hours, Minutes, TwoDigitsClock, TwoDigitsHours, TwoDigitsMinutes } from "../types/interfaces/time.interface";
import reverseString from "./reverseString";
import momentTimezone from "moment-timezone";
let persianDate = require("persian-date");
let jalaali = require("jalaali-js");
let moment = require("jalali-moment");

new Date().toLocaleDateString(undefined,{})
Intl
/*
uer input => locale
input dates & times => locale
saves => utc
outputs => utc => should return locale with format of ISO string
                  so we fool js into arbitrary utc input which is
                  the locale date: new Date(t.toLocaleString() + "+0")
*/



export default class Time {
  //the most common usage of custom time format
  constructor() { };
  //for making all time numbers as two digit numbers
  static makeTwoDigits(time: Clock | Hours | Minutes): TwoDigitsClock | TwoDigitsHours | TwoDigitsMinutes {
    let timeArray = time.split(":");
    switch (timeArray.length) {
      case 1: // Hours | Minutes
        return ("0" + timeArray[0] as Hours).slice(-2) as TwoDigitsHours | TwoDigitsMinutes
      default: // Clock
        let hour = ("0" + timeArray[0] as Hours).slice(-2) as TwoDigitsHours
        let minute = ("0" + timeArray[1] as Minutes).slice(-2) as TwoDigitsMinutes;
        return `${hour}:${minute}` as TwoDigitsClock;
    };
  };
  //for convert time to cron format
  static toCron(time: Clock): Cron { // 08:00 => 00 08 * * 
    let timeArray = time.split(":");
    let hour = this.makeTwoDigits(timeArray[0] as Hours) as TwoDigitsHours;
    let minute = this.makeTwoDigits(timeArray[1] as Minutes) as TwoDigitsMinutes;
    let cron = minute + " " + hour + " * * " as Cron;
    return cron;
  };
  //for convert cron to date format
  static toDate(cron: Cron) { };
  //for add day of week to cron format
  static toCronDay(time_cron: Cron, dayOfWeek: DayOfWeek): CronDay { return `${time_cron}${dayOfWeek}` as CronDay; };
  //for compare time
  static compareTime(start: Clock, stop: Clock): boolean {
    return new Date(`1/1/1998 ${stop}`) > new Date(`1/1/1998 ${start}`); // 1/1/1998 is arbitrary
  };

  //convert date to epoch
  static toTimestamp(date: DateType, time: Clock): number {
    return (new Date(
      [date, time].join(" ")
    )).getTime();
  };

  static stringToDate(date: string, time: string, timezone: string, is_reverse = false): string {
    let dates = date.split("/");
    for (let i = 0; i < dates.length; ++i) {
      if (dates[i].length == 1) {
        dates[i] = "0" + dates[i];
      }
    }
    is_reverse ? dates = [dates[2], dates[0], dates[1]] : dates;
    let times = time.split(":");
    for (let i = 0; i < times.length; ++i) {
      if (times[i].length == 1) {
        times[i] = "0" + times[i];
      }
    }
    const d = dates.join("-");
    const t = times.join(":");
    const dt = d + " " + t + ":00";
    //  const timeDateStart = new Date(dt.replace(/-/g, "/"));
    let a2 = momentTimezone.tz(dt, timezone);
    let c2 = a2.utc().format();
    return c2;
  }

  static stringToList(date: string): number[] {
    let times_dates = date.split("T");
    let dates = times_dates[0]?.split("-");
    let times = times_dates[1]?.split(":");
    if (times[2]?.length == 3) {
      times[2] = times[2].substring(0, times[2].length - 1);
    }
    return [Number(dates[0]), Number(dates[1]) - 1, Number(dates[2]), Number(times[0]), Number(times[1]), Number(times[2])];
  }

  static getEpochList(startDate: string, stopDate: string, start_time: string, stop_time: string, timezone: string): object[] {
    let start_date_iso: string = convert_string_Date(startDate, start_time, timezone);
    let start_date = new Date(start_date_iso);
    let stop_date_iso: string = convert_string_Date(stopDate, stop_time, timezone);
    let stop_date = new Date(stop_date_iso);
    let epoch_list: object[] = [];
    let start_ens_epoch = { gte: "", lte: "" };
    for (let d = start_date; d <= stop_date; d.setDate(d.getDate() + 1)) {
      let x1 = convert_string_Date(d.toLocaleDateString("en-US", { timeZone: timezone }), start_time, timezone, true);
      let x = string_date_to_list(x1);
      let z1 = convert_string_Date(d.toLocaleDateString("en-US", { timeZone: timezone }), stop_time, timezone, true);
      let z = string_date_to_list(z1);
      start_ens_epoch.gte = new Date(Date.UTC(x[0], x[1], x[2], x[3], x[4], x[5])).getTime().toString();
      start_ens_epoch.lte = new Date(Date.UTC(z[0], z[1], z[2], z[3], z[4], z[5])).getTime().toString();
      // let r1 = new Date(Date.UTC(x[0],x[1],x[2],x[3],x[4],x[5])).getTime().toString();
      // let r2 = new Date(Date.UTC(z[0],z[1],z[2],z[3],z[4],z[5])).getTime().toString();
      // start_ens_epoch.gte = Date.UTC(start_date_daily[0],start_date_daily[1],start_date_daily[2],start_date_daily[3],start_date_daily[4],start_date_daily[5]).toString();
      // start_ens_epoch.lte = Date.UTC(stop_date_daily[0],stop_date_daily[1],stop_date_daily[2],stop_date_daily[3],stop_date_daily[4],stop_date_daily[5]).toString();
      epoch_list.push(start_ens_epoch);
      start_ens_epoch = { gte: "", lte: "" };
    }
    return epoch_list;
  }

};

export function convert_string_Date(date: DateType, time: Clock, timezone: string, isReverse = false): string {
  let dateArray = date.split("/").map(val => val.length > 1 ? val : ("0" + val).slice(-2)); // make only one digit numbers into two digits
  if (isReverse) dateArray = dateArray.reverse();
  const d = dateArray.join("-");
  const t = Time.makeTwoDigits(time) as Clock;
  //  const timeDateStart = new Date(dt.replace(/-/g, "/"));
  let a2 = momentTimezone.tz([d, t].join(" "), timezone);
  let c2 = a2.utc().format();
  return c2;
}

export function string_date_to_list(date: string): number[] {
  let times_dates = date.split("T");
  let dates = times_dates[0]?.split("-");
  let times = times_dates[1]?.split(":");
  if (times[2]?.length == 3) {
    times[2] = times[2].substring(0, times[2].length - 1);
  }
  return [Number(dates[0]), Number(dates[1]) - 1, Number(dates[2]), Number(times[0]), Number(times[1]), Number(times[2])];
}

export function getEpochList(startDate: string, stopDate: string, start_time: string, stop_time: string, timezone: string): object[] {
  let start_date_iso: string = convert_string_Date(startDate, start_time, timezone);
  let start_date = new Date(start_date_iso);
  let stop_date_iso: string = convert_string_Date(stopDate, stop_time, timezone);
  let stop_date = new Date(stop_date_iso);
  let epoch_list: object[] = [];
  let start_ens_epoch = { gte: "", lte: "" };
  for (let d = start_date; d <= stop_date; d.setDate(d.getDate() + 1)) {
    let x1 = convert_string_Date(d.toLocaleDateString("en-US", { timeZone: timezone }), start_time, timezone, true);
    let x = string_date_to_list(x1);
    let z1 = convert_string_Date(d.toLocaleDateString("en-US", { timeZone: timezone }), stop_time, timezone, true);
    let z = string_date_to_list(z1);
    start_ens_epoch.gte = new Date(Date.UTC(x[0], x[1], x[2], x[3], x[4], x[5])).getTime().toString();
    start_ens_epoch.lte = new Date(Date.UTC(z[0], z[1], z[2], z[3], z[4], z[5])).getTime().toString();
    // let r1 = new Date(Date.UTC(x[0],x[1],x[2],x[3],x[4],x[5])).getTime().toString();
    // let r2 = new Date(Date.UTC(z[0],z[1],z[2],z[3],z[4],z[5])).getTime().toString();
    // start_ens_epoch.gte = Date.UTC(start_date_daily[0],start_date_daily[1],start_date_daily[2],start_date_daily[3],start_date_daily[4],start_date_daily[5]).toString();
    // start_ens_epoch.lte = Date.UTC(stop_date_daily[0],stop_date_daily[1],stop_date_daily[2],stop_date_daily[3],stop_date_daily[4],stop_date_daily[5]).toString();
    epoch_list.push(start_ens_epoch);
    start_ens_epoch = { gte: "", lte: "" };
  }
  return epoch_list;
}
