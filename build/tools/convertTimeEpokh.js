"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const reverseString_1 = __importDefault(require("./reverseString"));
//convert date to epokh
function date2Epokh(date, time) {
    //revers date string and concat with time
    let timeDateStart = (0, reverseString_1.default)(date) + "T" + time + ":00";
    //convert date to epokh
    let timeDateEpokhStart = new Date(timeDateStart).getTime();
    //delete last 3 digits from epokh for delete milisecond
    timeDateEpokhStart = timeDateEpokhStart / 1000;
    //convert epokh to Scientific Symbol
    let timeStartScientificSymbol = timeDateEpokhStart.toExponential();
    return timeStartScientificSymbol;
}
exports.default = date2Epokh;
