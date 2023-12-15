import { ISchedule } from "../types/interfaces/schedule.interface";
import { NextFunction, Request, Response } from "express";
import { Clock, Cron, CronDay, DayOfWeek, Hours, Minutes, TwoDigitsClock, TwoDigitsHours, TwoDigitsMinutes } from "../types/interfaces/time.interface";
//TODO: clean this up
import reverseString from "./reverseString";
import momentTimezone from "moment-timezone";
import { ApiError } from "../types/classes/error.class";
let persianDate = require("persian-date");
let jalaali = require("jalaali-js");
let moment = require("jalali-moment");

/*
uer input => locale
input dates & times => locale
saves => utc
outputs => utc/locale => should return locale with format of ISO string
                  so we fool js into arbitrary utc input which is
                  the locale date: new Date(t.toLocaleString() + "+0")
re-input => shoul be locale right?
*/
export default class Time {
  //the most common usage of custom time format
  constructor() { };
  //for making all time numbers as two digit numbers
  static makeTwoDigits(timeOrDate: Clock | Hours | Minutes | string): TwoDigitsClock | TwoDigitsHours | TwoDigitsMinutes | string {
    if (timeOrDate.includes("/")) {
      let dateArray = timeOrDate.split("/").map(val => val.length > 1 ? val : ("0" + val).slice(-2)); // make only one digit numbers into two digits
      return dateArray.join("/");
    } else {
      let timeArray = timeOrDate.split(":");
      switch (timeArray.length) {
        case 1: // Hours | Minutes
          return ("0" + timeArray[0] as Hours).slice(-2) as TwoDigitsHours | TwoDigitsMinutes
        default: // Clock
          let hour = ("0" + timeArray[0] as Hours).slice(-2) as TwoDigitsHours
          let minute = ("0" + timeArray[1] as Minutes).slice(-2) as TwoDigitsMinutes;
          return `${hour}:${minute}` as TwoDigitsClock;
      };
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
    return new Date(`6/14/1998 ${stop}`) > new Date(`6/14/1998 ${start}`); // 1/1/1998 is arbitrary
  };
  static compareTimeMiddleware(startNamePropery: string, stopNamePropery: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!!req.body[startNamePropery] && !!req.body[stopNamePropery] && !this.compareTime(req.body[startNamePropery], req.body[stopNamePropery])) {
        req.flash("error", "Invalid time");
        return next(new ApiError(400, "Invalid time"));
      };
      next();
    }
  }
  static fromCron(cron: Cron) {
    let time = cron.split(" ");
    return `${time[1]}:${time[0]}`;
  }

  //convert date to epoch
  static toTimestamp(date: string, time: Clock): number {
    return (new Date(
      [date, time].join(" ")
    )).getTime();
  };

  static toString(date: string, time: Clock, isUS = false): string {
    if (isUS) {// month/day/year
      let temp = date.split("/");
      date = [temp[2], temp[0], temp[1]].join("/");
    };
    date = Time.makeTwoDigits(date);
    time = Time.makeTwoDigits(time) as TwoDigitsClock;
    return new Date(new Date([date, time, "+0"].join(" "))).toISOString();
  };

  static toList(date: string): number[] {
    let d = new Date(date)
    return [d.getFullYear(), d.getMonth() - 1, d.getDay(), d.getHours(), d.getMinutes(), d.getSeconds()];
  };

  static getEpochList(startDate: string, stopDate: string, start_time: Clock, stop_time: Clock, timezone: string): object[] {
    let start_date = new Date(startDate + " " + start_time + Time.getUtcOffset(timezone));// TODO: offset (+3:30) based on timezone
    let stop_date = new Date(stopDate + " " + stop_time + Time.getUtcOffset(timezone));// TODO: offset (+3:30) based on timezone

    let epoch_list: object[] = [];
    let start_ens_epoch = {
      gte: "", lte: "" // representing the start and end times of that day in epoch time
    };
    for (let d = start_date; d <= stop_date; d.setDate(d.getDate() + 1)) { // incrementing the date by one day at each iteration.
      start_ens_epoch.gte = String(d.getTime())
      let f = new Date(d);
      f.setHours(stop_date.getHours());
      f.setMinutes(stop_date.getMinutes());
      start_ens_epoch.lte = String(f.getTime())
      epoch_list.push(start_ens_epoch);
      // start_ens_epoch = { gte: "", lte: "" };
    };
    return epoch_list;
  };

  //for overlap validation of schedules
  static validateTime(newStart: Clock, newStop: Clock, newDayOfWeek: Array<string>, schedules: ISchedule[]) {
    return schedules.every((schedule) => { // all of schedules must let new schedule pass (no overlap)
      let oldDayOfweek = schedule.start_cron.split(" ").pop() as string;
      return newDayOfWeek.every((el) => {
        if (!oldDayOfweek.split(",").includes(el)) return true;
        let oldStart = this.fromCron(schedule.start_cron as Cron) as Clock;
        let oldStop = this.fromCron(schedule.stop_cron as Cron) as Clock;
        if (this.compareTime(newStart, oldStart)) { // oldStart > newStart
          return this.compareTime(newStop, oldStart) // should be like (oldStart > newStop)
        } else { // newStart >= oldStart
          return this.compareTime(oldStop, newStart) // should be like (newStart > oldStop)
        };
      });
    });
  };

  //for overlap validation of schedules
  static validateTimeMiddleware(startNamePropery: string, stopNamePropery: string, dayOfWeekNameProperty: string, scheduleListNamePropery: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.validateTime(req.body[startNamePropery], req.body[stopNamePropery], req.body[dayOfWeekNameProperty], req.body[scheduleListNamePropery])) return next();
      req.flash("error", "Overlaped Schedule!");
      return next(new ApiError(400, "Overlaped Schedule!"));
    };
  };

  static getUtcOffset(timeZone: string) {
    const timeZoneName = Intl.DateTimeFormat("ia", {
      timeZoneName: "short",
      timeZone
    }).formatToParts().find((i) => i.type === "timeZoneName")?.value;
    if (!timeZoneName) return 0;
    const offset = timeZoneName.slice(3);
    if (!offset) return 0;
    return offset;
  };
};
