import Excel, { Column, Style } from 'exceljs';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../types/classes/error.class';
import { platesToStrings } from './car.tools';
import sizeOf from 'image-size';
import { stringEnglishToStringPersian, stringTortl } from './plate.tools';

type Col = {
	header?: string;
	colSettings?: Partial<Column>;
	colStyle?: Partial<Style>;
	image?: boolean;
	transform?: (data: any) => any;
};

type DataType = {
	cols?: { [key: string]: Col } | ((req: Request) => { [key: string]: Col });
} & ExactlyOneOf<{
	rows: Array<any> | string | ((req: Request) => Array<any>);
	row: any | string | ((req: Request) => any);
}>;

/**
 * Middleware function to generate and send an Excel file response.
 *
 * This function creates an Excel file based on the provided data and sends it as a response.
 * It handles dynamic column generation, data transformation, and image insertion.
 *
 * @param {DataType} data - The data object containing columns and rows definitions.
 * @param {object} [options] - Optional parameters for customization.
 * @param {boolean} [options.rtl=false] - Enable right-to-left layout.
 * @param {(string|Promise<string>)} [options.name] - Custom filename or function to generate filename.
 *
 * @returns {RequestHandler} - Express middleware function.
 */
export function sendExcelMiddleware(
	data: DataType,
	options?: {
		rtl?: boolean;
		name: string | ((req: Request) => string | Promise<string>);
	}
): RequestHandler {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
			// if (options?.name) res.setHeader('Content-Disposition', `attachment; filename=${typeof options.name === 'function' ? options.name(req) : options.name}.xlsx`);
			// else {
			//   const time = new Date().toLocaleString().replace(" ", "");
			// res.setHeader('Content-Disposition', `attachment; filename=Report-${time}-(${req.user.username}).xlsx`);
			// }
			// res.setHeader('Content-Disposition', `attachment; filename=Report.xlsx`);
			const workbook = new Excel.Workbook();
			// const workbook = new Excel.stream.xlsx.WorkbookWriter({
			//   stream: res,
			//   zip: { zlib: { level: 9 } }, // Don't delete this
			// });
			workbook.creator = req.user?.username;
			workbook.lastModifiedBy = req.user?.username;
			workbook.created = new Date();
			const worksheet = workbook.addWorksheet('Data', {
				pageSetup: { paperSize: 9, orientation: 'portrait' }
			});
			// worksheet.views = [{ "state": "normal", "rightToLeft": options?.rtl }];
			////////////////////////////////////////////
			let rows = data.row ?? data.rows;
			rows = typeof rows === 'string' ? req.body[rows] : typeof rows === 'function' ? rows(req) : rows;
			rows = Array.isArray(rows) ? rows : [rows];
			////////////////////////////////////////////
			const sampleData = rows[0];
			const defCols =
				(typeof data.cols === 'function' ? data.cols(req) : data.cols) ??
				Object.fromEntries(
					Object.keys(sampleData ?? {}).map((key) => [key, computeDefaultCol(key, sampleData)])
				);
			const cols: Partial<Column>[] = [];
			for (const col of Object.keys(defCols)) {
				if (!['rows'].includes(col))
					cols.push({
						header: defCols[col].header ?? col,
						key: col,
						...defCols[col].colSettings,
						style: { ...computeDefaultStyle(), ...defCols[col].colStyle }
					});
			}
			worksheet.columns = cols;
			////////////////////////////////////////////
			for (const [ir, row] of rows.entries()) {
				const images: any = [];
				const insertedRow = worksheet.getRow(ir + 2);
				insertedRow.values = cols.map((col, ic) => {
					const key = col.key as string;
					try {
						const refCol = worksheet.getColumn(key);
						const width = refCol.width;
						const transform = defCols[key]?.transform;
						const image = !!defCols[key]?.image;
						const value = !!transform ? transform(row[key]) : image ? '' : row[key];
						const valueWidth = (value ?? '').toString().length;
						if (valueWidth > (width ?? 16)) refCol.width = valueWidth * 1.2;
						if (image && !!row[key]) {
							let imgBuffer = Buffer.from(row[key].split('base64,').at(-1), 'base64');
							let dimensions = sizeOf(imgBuffer);
							const imageId = workbook.addImage({
								base64: row[key],
								extension: 'jpeg'
							});
							images.push({ id: imageId, ic, height: dimensions.height, width: refCol.width });
						}
						return value;
					} catch (error) {
						console.error(error);
						return '';
					}
				});
				for (const image of images) {
					insertedRow.height = image.height < 128 ? image.height : 128;
					worksheet.addImage(image.id, {
						//@ts-ignore
						tl: { col: image.ic, row: insertedRow.number - 1 },
						// ext: { width: image.width, height: insertedRow.height },
						//@ts-ignore
						br: { col: image.ic + 1, row: insertedRow.number }
						// editAs: 'oneCell' // Image will be moved with cells but not sized
						// editAs: 'absolute' // Image will be moved with cells but not sized
					});
				}
				// insertedRow.commit();
			}
			// worksheet.commit();
			// workbook.commit().then(res.end)
			workbook.xlsx.write(res);
		} catch (error: any) {
			return next(new ApiError(500, 'internal server error , ' + error.message));
		}
	};
}

function computeDefaultSettings(sampleData?: any) {
	return {};
}
function computeDefaultStyle(sampleData?: any) {
	return {};
}
function computeDefaultCol(key: string, sampleData?: any): Col {
	return {
		header: key,
		colSettings: computeDefaultSettings(sampleData),
		colStyle: { ...computeDefaultStyle(sampleData) }
	};
}

export const textStyle: Partial<Style> = {
	font: { name: 'Arial Black', family: 4, size: 11 },
	alignment: { horizontal: 'center', vertical: 'middle', wrapText: false, readingOrder: 'ltr' }
};

export const plateCols = {
	type: { header: 'Model', colSettings: { width: 16 }, colStyle: textStyle },
	owner: {
		header: 'Owner',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: string) => (!!v ? v : 'Unknown')
	},
	plate_number: {
		header: 'Plate Number',
		colSettings: { width: 16 },
		colStyle: {
			font: { name: 'Arial Black', family: 4, size: 14, bold: true },
			alignment: {
				horizontal: 'center' as 'center',
				vertical: 'middle' as 'middle',
				wrapText: false,
				readingOrder: 'rtl' as 'rtl'
			}
		},
		transform: (plate: any) =>
			stringTortl(stringEnglishToStringPersian(platesToStrings([plate])[0]), { sep: ' ' })
	},
	inner_crop: { header: 'Inner Crop', colSettings: { width: 16 }, image: true },
	camera_name: { header: 'Camera Name', colSettings: { width: 16 }, colStyle: textStyle },
	camera_type: { header: 'Camera Type', colSettings: { width: 16 }, colStyle: textStyle },
	department: { header: 'Department', colSettings: { width: 16 }, colStyle: textStyle },
	section: { header: 'Section', colSettings: { width: 16 }, colStyle: textStyle },
	// "color": {
	//   "header": "color",
	//   "colSettings": { width: 16 },
	//   "colStyle": textStyle
	// },
	fa_color: { header: 'Color', colSettings: { width: 16 }, colStyle: textStyle },
	brand: { header: 'Brand', colSettings: { width: 16 }, colStyle: textStyle },
	allowed: {
		header: 'Allowed',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: boolean) => (!!v ? 'yes' : 'no')
	},
	alert: {
		header: 'Alert',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: boolean) => (!!v ? 'yes' : 'no')
	},
	sms: {
		header: 'SMS',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: boolean) => (!!v ? 'yes' : 'no')
	},
	description: { header: 'Description', colSettings: { width: 16 }, colStyle: textStyle },
	time: { header: 'Time', colSettings: { width: 32 }, colStyle: textStyle }
	// "crop": { "header": "Crop", "colSettings": { width: 16 }, "image": true },
	// "frame": {
	//   "header": "Frame",
	//   "colSettings": { width: 16 },
	//   "image": true
	// }
};

export const faceCols = {
	type: { header: 'Model', colSettings: { width: 16 }, colStyle: textStyle },
	fullName: {
		header: 'Name',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: string) => (!!v ? v : 'Unknown')
	},
	crop: { header: 'Inner Crop', colSettings: { width: 16 }, image: true },
	camera_name: { header: 'Camera Name', colSettings: { width: 16 }, colStyle: textStyle },
	camera_type: { header: 'Camera Type', colSettings: { width: 16 }, colStyle: textStyle },
	department: { header: 'Department', colSettings: { width: 16 }, colStyle: textStyle },
	section: { header: 'Section', colSettings: { width: 16 }, colStyle: textStyle },
	allowed: {
		header: 'Allowed',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: boolean) => (!!v ? 'yes' : 'no')
	},
	alert: {
		header: 'Alert',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: boolean) => (!!v ? 'yes' : 'no')
	},
	sms: {
		header: 'SMS',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: boolean) => (!!v ? 'yes' : 'no')
	},
	description: { header: 'Description', colSettings: { width: 16 }, colStyle: textStyle },
	face_confidence: {
		header: 'Confidence',
		colSettings: { width: 16 },
		transform: (v: string) => parseFloat(v),
		colStyle: {
			numFmt: '0.00%',
			alignment: { horizontal: 'center' as 'center', vertical: 'middle' as 'middle' }
		}
	},
	time: { header: 'Time', colSettings: { width: 32 }, colStyle: textStyle }
	// "crop": { "header": "Crop", "colSettings": { width: 16 }, "image": true },
};

export const productCols = {
	first_name: { header: 'نام', colSettings: { width: 16 }, colStyle: textStyle },
	last_name: { header: 'نام خانوادگی', colSettings: { width: 16 }, colStyle: textStyle },
	person_image: { header: 'تصویر', colSettings: { width: 16 }, image: true },
	name: { header: 'نام محصول', colSettings: { width: 16 }, colStyle: textStyle },
	person_type: {
		header: 'خریدار / فروشنده',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (v: string) => (v === 'client_buyer' ? 'خریدار' : 'فروشنده')
	},
	image: { header: 'تصویر محصول', colSettings: { width: 16 }, image: true },
	create_time: {
		header: 'زمان ثبت',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (d: Date) => d.toTimeString().split(' ')[0]
	},
	create_date: {
		header: 'تاریخ ثبت',
		colSettings: { width: 16 },
		colStyle: textStyle,
		transform: (d: Date) => d.toLocaleDateString('fa-ir')
	},
	product_weight: { header: 'وزن محصول', colSettings: { width: 16 }, colStyle: textStyle }
};
