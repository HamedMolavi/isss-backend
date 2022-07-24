"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataTime2TimeStamp = exports.date2Epokh = exports.compareTime = exports.convertToCronDay = exports.convertToCron = void 0;
const reverseString_1 = __importDefault(require("./reverseString"));
//for convert time to cron format
const convertToCron = (time) => {
    let timeArray = time.split(":");
    return timeArray[1] + " " + timeArray[0] + " * * ";
};
exports.convertToCron = convertToCron;
//for add day of week to cron format
const convertToCronDay = (time_cron, dayOfWeek) => {
    return time_cron + dayOfWeek;
};
exports.convertToCronDay = convertToCronDay;
//for compare time
const compareTime = (start, stop) => {
    let startTime = start.split(":");
    let stopTime = stop.split(":");
    if (parseInt(startTime[0]) > parseInt(stopTime[0])) {
        return false;
    }
    else if (parseInt(startTime[0]) === parseInt(stopTime[0]) &&
        parseInt(startTime[1]) >= parseInt(stopTime[1])) {
        return false;
    }
    return true;
};
exports.compareTime = compareTime;
//convert date to epokh
function date2Epokh(date, time) {
    //revers date string and concat with time
    let timeDateStart = (0, reverseString_1.default)(date) + "T" + time + ":00";
    //convert date to epokh
    let timeDateEpokhStart = new Date(timeDateStart).getTime();
    //delete last 3 digits from epokh for delete milisecond
    // timeDateEpokhStart = timeDateEpokhStart / 1000;
    //convert epokh to Scientific Symbol
    // let timeStartScientificSymbol = timeDateEpokhStart.toExponential();
    return timeDateEpokhStart.toString();
}
exports.date2Epokh = date2Epokh;
//convert dataTime to TimeStamp
function dataTime2TimeStamp(date, time) {
    //revers date string and concat with time
    let timeDateStart = (0, reverseString_1.default)(date) + "T" + time;
    //convert date to timestamp
    const dt = Date.parse(timeDateStart);
    return dt / 1000;
}
exports.dataTime2TimeStamp = dataTime2TimeStamp;
