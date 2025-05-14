export const DIGITS: { [key: string]: string } = {
	_: '_',
	'0': '0',
	'1': '1',
	'2': '2',
	'3': '3',
	'4': '4',
	'5': '5',
	'6': '6',
	'7': '7',
	'8': '8',
	'9': '9',
	'٠': '0',
	'١': '1',
	'٢': '2',
	'٣': '3',
	'٤': '4',
	'٥': '5',
	'٦': '6',
	'٧': '7',
	'٨': '8',
	'٩': '9', // Arabic-Indic
	'۰': '0',
	'۱': '1',
	'۲': '2',
	'۳': '3',
	'۴': '4',
	'۵': '5',
	'۶': '6',
	'۷': '7',
	'۸': '8',
	'۹': '9' // Persian
};

export const persianPlateDict: any = {
	U: 'ع',
	X: 'ط',
	W: 'ص',
	S: 'س',
	Y: 'ی',
	A: 'الف',
	H: 'ه',
	J: 'ج',
	G: 'ق',
	M: 'م',
	B: 'ب',
	V: 'و',
	N: 'ن',
	L: 'ل',
	O: 'ش',
	P: 'پ',
	E: 'ث',
	T: 'ت',
	D: 'د',
	'@': 'D',
	'#': 'S',
	Z: 'ز',
	F: 'ف',
	K: 'ک',
	'&': 'گ',
	d: 'دیپلمات',
	$: 'تشریفات',
	C: 'کم توان'
};

export const englishPlateDict: any = {
	ع: 'U',
	ط: 'X',
	ص: 'W',
	س: 'S',
	ی: 'Y',
	الف: 'A',
	ه: 'H',
	ج: 'J',
	ق: 'G',
	م: 'M',
	ب: 'B',
	و: 'V',
	ن: 'N',
	ل: 'L',
	ش: 'O',
	پ: 'P',
	ث: 'E',
	ت: 'T',
	د: 'D',
	D: '@',
	S: '#',
	ز: 'Z',
	ف: 'F',
	ک: 'K',
	گ: '&',
	دیپلمات: 'd',
	تشریفات: '$',
	'کم توان': 'C'

	// "ع": "U",
	// "ط": "X",
	// "ص": "W",
	// "س": "S",
	// "ی": "Y",
	// "الف": "A",
	// "ه‍": "H", // ascii code is 1607-8205
	// "ج": "J",
	// "ق": "G",
	// "م": "M",
	// "ب": "B",
	// "و": "V",
	// "ن": "N",
	// "ل": "L",
	// "ش": "O",
	// "پ": "P",
	// "ث": "E",
	// "ت": "T",
	// "د": "D",
	// "ک": "K",
	// "ویلچر": "C",
	// "دیپلمات":"d",
	// "سیاسی":"s",
	// "گذر موقت":"g",
	// "تشریفات":"t"
};

// Deprecated
export function english2Persian(plate_number: string): string {
	let tmp = {
		first: Number(plate_number.substr(0, 2)),
		second: persianPlateDict[plate_number.substr(2, 1)],
		third: Number(plate_number.substr(3, 3)),
		fourth: 'ایران',
		fifth: Number(plate_number.substr(6, 2))
	};
	let result = `(${tmp.first}${tmp.second}${tmp.third}${tmp.fourth}${tmp.fifth})`;
	return result;
}

export function formatNumber(str: string, options?: { len?: number }) {
	let res = str
		.split('')
		.map((n) => {
			switch (true) {
				case ['*'].includes(n):
					return n;
				case !isNaN(parseInt(n)):
					return Number(n).toLocaleString('fa-IR');
			}
			return '_';
		})
		.join('');
	return !!res ? res : Array(options?.len).fill('_').join('');
}

export function stringPlateToJson(plate_number: string) {
	if (typeof plate_number !== 'string') return '';
	let plateNumber1 = formatNumber(plate_number.slice(0, 2), { len: 2 });
	let plateNumber2 = !!plate_number.slice(2, 3).match(new RegExp(/\*/))
		? plate_number.slice(2, 3)
		: persianPlateDict[plate_number.slice(2, 3)];
	let plateNumber3 = formatNumber(plate_number.slice(3, 6), { len: 3 });
	let plateNumber4 = formatNumber(plate_number.slice(6, 8), { len: 2 });
	//add plate number to json response for sort persian format in font end
	return {
		first: plateNumber1,
		second: plateNumber2,
		third: plateNumber3,
		fourth: 'ایران',
		fifth: plateNumber4
	};
}

export function stringPersianToStringEnglish(plate_number: string): string {
	if (typeof plate_number !== 'string') return '';
	else {
		const plateArray = plate_number.split('');
		for (const [indx, letter] of plateArray.entries()) {
			if (Object.prototype.hasOwnProperty.call(englishPlateDict, letter)) {
				plateArray[indx] = englishPlateDict[letter];
			}
		}
		return plateArray.join('');
	}
}
export function stringEnglishToStringPersian(plate_number: string): string {
	if (typeof plate_number !== 'string') return '';
	else {
		const plateArray = plate_number.split('');
		for (const [indx, letter] of plateArray.entries()) {
			if (Object.prototype.hasOwnProperty.call(persianPlateDict, letter)) {
				plateArray[indx] = persianPlateDict[letter];
			}
		}
		return plateArray.join('');
	}
}

export function stringTortl(plate_number: string, options?: { sep?: string }): string {
	let arr = plate_number.split('');
	let first = arr.slice(0, 2).join('');
	let second = arr.slice(2, 3).join('');
	let third = arr.slice(3, 6).join('');
	let forth = arr.slice(6, 8).join('');
	return [forth, '|', third, second, first].join(options?.sep ?? '');
}
