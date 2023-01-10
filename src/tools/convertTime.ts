import reverseString from "./reverseString";
import momentTimezone from "moment-timezone";
let persianDate = require("persian-date");
var jalaali = require("jalaali-js");
var moment = require("jalali-moment");

//for convert time to cron format
export const convertToCron = (time: string) => {
  let timeArray = time.split(":");
  return timeArray[1] + " " + timeArray[0] + " * * ";
};

//for convert time to cron format
export const convertCronToDate = (time: string) => {};

//for add day of week to cron format
export const convertToCronDay = (time_cron: string, dayOfWeek: string) => {
  return time_cron + dayOfWeek;
};

//for compare time
export const compareTime = (start: string, stop: string) => {
  let startTime = start.split(":");
  let stopTime = stop.split(":");
  if (parseInt(startTime[0]) > parseInt(stopTime[0])) {
    return false;
  } else if (parseInt(startTime[0]) === parseInt(stopTime[0]) && parseInt(startTime[1]) >= parseInt(stopTime[1])) {
    return false;
  }
  return true;
};

//convert date to epokh
export function date2Epokh(date: string, time: string, timezone: string): string {
  //revers date string and concat with time
  let dates = date.split("/");
  let times = time.split(":");
  const d = dates.join("-");
  const t = times.join(":");
  const dt = d + " " + t + ":00";
  const timeDateStart = new Date(dt.replace(/-/g, "/")).toLocaleString("en-US", { timeZone: timezone });
  const timeDateEpokhStart = new Date(timeDateStart).getTime();
  return timeDateEpokhStart.toString();
}

//convert dataTime to TimeStamp
export function dataTime2TimeStamp(date: string, time: string) {
  //revers date string and concat with time
  let timeDateStart: string = reverseString(date) + "T" + time;
  //convert date to timestamp
  const dt = Date.parse(timeDateStart);
  return dt / 1000;
}

export function convert_string_Date(date: string, time: string, timezone: string, is_reverse = false): string {
  let dates = date.split("/");
  for (let i = 0; i < dates.length; ++i) {
    if (dates[i].length == 1) {
      dates[i] = "0" + dates[i];
    }
  }
  is_reverse ? dates = [dates[2],dates[0],dates[1]] : dates;
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
  var a2 = momentTimezone.tz(dt, timezone);
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
  return [Number(dates[0]), Number(dates[1])-1,Number(dates[2]),Number(times[0]), Number(times[1]), Number(times[2])];
}

export function getEpochList(startDate: string, stopDate: string, start_time: string, stop_time: string, timezone: string): object[] {
  let start_date_iso: string = convert_string_Date(startDate, start_time, timezone);
  let start_date = new Date(start_date_iso);
  let stop_date_iso: string = convert_string_Date(stopDate, stop_time, timezone);
  let stop_date = new Date(stop_date_iso);
  let epoch_list: object[] = [];
  let start_ens_epoch = { gte: "", lte: "" };
  for (var d = start_date; d <= stop_date; d.setDate(d.getDate() + 1)) {
    let x1 = convert_string_Date(d.toLocaleDateString("en-US", { timeZone: timezone }), start_time, timezone, true);
    let x = string_date_to_list(x1);
    let z1 = convert_string_Date(d.toLocaleDateString("en-US", { timeZone: timezone }), stop_time, timezone, true);
    let z = string_date_to_list(z1);
    start_ens_epoch.gte  =new Date(Date.UTC(x[0],x[1],x[2],x[3],x[4],x[5])).getTime().toString();
    start_ens_epoch.lte =new Date(Date.UTC(z[0],z[1],z[2],z[3],z[4],z[5])).getTime().toString();
   // let r1 = new Date(Date.UTC(x[0],x[1],x[2],x[3],x[4],x[5])).getTime().toString();
   // let r2 = new Date(Date.UTC(z[0],z[1],z[2],z[3],z[4],z[5])).getTime().toString();
    // start_ens_epoch.gte = Date.UTC(start_date_daily[0],start_date_daily[1],start_date_daily[2],start_date_daily[3],start_date_daily[4],start_date_daily[5]).toString();
    // start_ens_epoch.lte = Date.UTC(stop_date_daily[0],stop_date_daily[1],stop_date_daily[2],stop_date_daily[3],stop_date_daily[4],stop_date_daily[5]).toString();
    epoch_list.push(start_ens_epoch);
    start_ens_epoch = { gte: "", lte: "" };
  }
  return epoch_list;
}
