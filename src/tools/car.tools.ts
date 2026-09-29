import { ICar } from '../types/interfaces/car.interface';
import { DIGITS, englishPlateDict, persianPlateDict, stringPlateToJson } from './plate.tools';
import { allowedPassRevert } from './time.tools';

export interface PlateInput {
	first?: string | number;
	second?: string;
	third?: string | number;
	fourth?: string;
	fifth?: string | number;
}

export function carSendFunction(doc: ICar) {
	return {
		owner: doc.owner,
		number_plate: stringPlateToJson(doc.number_plate),
		brand: doc.brand,
		color: doc.color,
		allowed_pass: !!doc.allowed_pass ? allowedPassRevert(doc) : undefined,
		camera_whitelist: doc.camera_whitelist,
		_id: doc._id
	};
}

function normalizePlateDigits(value: unknown, length: number): string | null {
	if (value === undefined || value === null) return null;

	const normalized = String(value)
		.trim()
		.split('')
		.map((digit) => DIGITS[digit] ?? '')
		.join('');

	if (!new RegExp(`^[0-9]{${length}}$`).test(normalized)) return null;
	return normalized;
}

function normalizePlateLetter(value: unknown): string | null {
	if (typeof value !== 'string') return null;

	const normalized = value.replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
	if (!normalized) return null;

	if (Object.prototype.hasOwnProperty.call(englishPlateDict, normalized)) {
		return englishPlateDict[normalized];
	}

	const upperCaseLetter = normalized.toUpperCase();
	if (Object.prototype.hasOwnProperty.call(persianPlateDict, upperCaseLetter)) {
		return upperCaseLetter;
	}

	return null;
}

export function normalizePlateInput(plate?: PlateInput): string | null {
	if (!plate || typeof plate !== 'object') return null;

	const first = normalizePlateDigits(plate.first, 2);
	const second = normalizePlateLetter(plate.second);
	const third = normalizePlateDigits(plate.third, 3);
	const fifth = normalizePlateDigits(plate.fifth, 2);

	if (!first || !second || !third || !fifth) return null;
	return `${first}${second}${third}${fifth}`;
}

export function isValidPlateInput(plate?: PlateInput): boolean {
	return normalizePlateInput(plate) !== null;
}

export function stringifyPlate(body: { number_plate?: PlateInput }) {
	return normalizePlateInput(body?.number_plate) ?? '';
}

export function platesToStrings(
	plates: Array<{ first: string; second: string; third: string; fourth: 'ایران'; fifth: string }>
) {
	let results: string[];
	// if (!plates.every((plate) => Object.values(plate).reduce((pre, curr) => pre + (!!curr ? 1 : 0), 0)===5)) return []

	results = plates.map((plate) => {
		return `${
			['', '?', '??', '؟', '؟؟'].includes(plate.first)
				? '??'
				: plate.first.length === 1
					? plate.first + '?'
					: plate.first.slice(0, 2)
		}${englishPlateDict[plate.second] ?? '?'}${
			['', '?', '??', '???', '؟', '؟؟', '؟؟؟'].includes(plate.third)
				? '???'
				: ([1, 2].includes(plate.third.length) ? plate.third + '??' : plate.third).slice(0, 3)
		}${
			['', '?', '??', '؟', '؟؟'].includes(plate.fifth)
				? '??'
				: plate.fifth.length === 1
					? plate.fifth + '?'
					: plate.fifth.slice(0, 2)
		}`;
	});

	return results;
}
