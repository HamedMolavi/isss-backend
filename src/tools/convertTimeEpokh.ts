import reverseString from "./reverseString";

//convert date to epokh
function date2Epokh(date : string , time : string) : string {
    //revers date string and concat with time
    let timeDateStart: string = reverseString(date) + "T" + time + ":00";
    //convert date to epokh
    let timeDateEpokhStart: number = new Date(timeDateStart).getTime();
    //delete last 3 digits from epokh for delete milisecond
    timeDateEpokhStart = timeDateEpokhStart / 1000;
    //convert epokh to Scientific Symbol
    let timeStartScientificSymbol = timeDateEpokhStart.toExponential();
    return timeStartScientificSymbol;
}

export default date2Epokh;