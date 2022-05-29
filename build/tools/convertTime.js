"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareTime = exports.convertToCronDay = exports.convertToCron = void 0;
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
    else if (parseInt(startTime[0]) === parseInt(stopTime[0]) && parseInt(startTime[1]) >= parseInt(stopTime[1])) {
        return false;
    }
    return true;
};
exports.compareTime = compareTime;
