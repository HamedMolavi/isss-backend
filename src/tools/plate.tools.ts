export const persianPlateDict: any = {
    "U": "ع",
    "X": "ط",
    "W": "ص",
    "S": "س",
    "Y": "ی",
    "A": "الف",
    "H": "ه‍",
    "J": "ج",
    "G": "ق",
    "M": "م",
    "B": "ب",
    "V": "و",
    "N": "ن",
    "L": "ل",
    "O": "ش",
    "P": "پ",
    "E": "ث",
    "T": "ت",
    "D": "د",
    "d":"دیپلمات",
    "s":"سیاسی",
    "g":"گذر موقت",
    "t":"تشریفات",
    "K": "ک",
    "C": "ویلچر",
};

export const englishPlateDict: any = {
    "ع": "U",
    "ط": "X",
    "ص": "W",
    "س": "S",
    "ی": "Y",
    "الف": "A",
    "ه‍": "H", // ascii code is 1607-8205
    "ج": "J",
    "ق": "G",
    "م": "M",
    "ب": "B",
    "و": "V",
    "ن": "N",
    "ل": "L",
    "ش": "O",
    "پ": "P",
    "ث": "E",
    "ت": "T",
    "د": "D",
    "ک": "K",
    "ویلچر": "C",
    "دیپلمات":"d",
    "سیاسی":"s",
    "گذر موقت":"g",
    "تشریفات":"t"
};

export function english2Persian(plate_number: string): string {
    let tmp = {
        first: Number(plate_number.substr(0, 2)),
        second: persianPlateDict[plate_number.substr(2, 1)],
        third: Number(plate_number.substr(3, 3)),
        fourth: "ایران",
        fifth: Number(plate_number.substr(6, 2)),
    };
    let result = `(${tmp.first}${tmp.second}${tmp.third}${tmp.fourth}${tmp.fifth})`
    return result;
};