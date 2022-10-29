import reverseString from "./reverseString";

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
export function date2Epokh(date: string, time: string): string {
  //revers date string and concat with time
  let dates = date.split("/");
  let times = time.split(":");
  //let timeDateStart: string = reverseString(date) + "T" + time + ":00";
  //convert date to epokh
  //let timeDateEpokhStart: number = new Date(timeDateStart).getTime();
  //const timeDateEpokhStart : number = new Date(Number(dates[2]), Number(dates[0]), Number(dates[1]), Number(times[0]), Number(times[1]), 0).getTime();
  const d = dates.join("-");
  const t = times.join(":");
  const dt = d + " " + t;
  //const timeDateEpokhStart : number = new Date(Number(dates[0]), Number(dates[1]), Number(dates[2]), Number(times[0]), Number(times[1]), 0,0).getTime();
  // const timeDateEpokhStart : number = new Date(Number(dates[0]), Number(dates[1]), Number(dates[2]), Number(times[0]), Number(times[1]), 0,0).getTime();
  const timeDateEpokhStart: number = new Date(dt.replace(/-/g,"/")).getTime();
  //delete last 3 digits from epokh for delete milisecond
  // timeDateEpokhStart = timeDateEpokhStart / 1000;
  //convert epokh to Scientific Symbol
  // let timeStartScientificSymbol = timeDateEpokhStart.toExponential();
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
