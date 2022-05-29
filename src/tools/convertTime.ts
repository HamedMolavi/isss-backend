//for convert time to cron format
export const convertToCron = (time: string) => {
    let timeArray = time.split(":");
    return timeArray[1] + " " + timeArray[0] + " * * ";
}

//for add day of week to cron format
export const convertToCronDay = (time_cron: string, dayOfWeek: string) => {
    return time_cron + dayOfWeek;
}

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
}