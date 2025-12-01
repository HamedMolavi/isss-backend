import { SnapshotKafka } from '../../tools/kafkaFile.tools';
import { NextFunction, Router, Request, Response } from 'express';
import PersonImage from '../../db/mongo/models/personImage';
import { createMiddleware } from '../../db/mongo/create.database';
import { randomUuid, resizeImage } from '../../tools/utils.tools';
import { dtoValidationMiddleware } from '../../validation/dto';
import mongoose from 'mongoose';
import { AddClient, AddHostilePerson, AddPersonImage } from '../../validation/dto/files.dto';
import { injectDataMiddleware } from '../../tools/request.tools';
import Personnel from '../../db/mongo/models/personnel';
import { allowedPassConvert } from '../../tools/time.tools';
import JobTitle from '../../db/mongo/models/jobTitle';
import { ApiError } from '../../types/classes/error.class';
import { hashString } from '../../tools/hash';
import Product from '../../db/mongo/models/product';
import Camera from '../../db/mongo/models/camera';
import multer from 'multer';

import { DataImportExportLogger } from '../../logger/data-input-output.logger';
import { accessCheck } from '../../authentication/accessCheck.auth';
import { checkIPRestriction } from '../../middleware/ip-restriction.middleware';
import { fileUploadSecurityValidation } from '../../middleware/batch-security-validation.middleware';
import { UploadedFile } from 'express-fileupload';
import Excel from 'exceljs';
import CarColor from '../../db/mongo/models/carColor';
import CarBrand from '../../db/mongo/models/carBrand';
import Car from '../../db/mongo/models/car';
import { stringPersianToStringEnglish } from '../../tools/plate.tools';
import { uploadBase64ImageToS3, batch_personnel_add } from '../../controllers/file.controller';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import S3Client from '../../config/s3.config';
import { BaseConfig } from '../../config/base.config';
import { FileCrate } from '../../file_upload/methods/file/file_create';

// Session secret for hashing operations
const SECRET = process.env['SESSION_SECRET'];

// Initialize Kafka handler for snapshot/image processing
const snapshotKafka = new SnapshotKafka();

// Create Express router for file operations
const router: Router = Router();

/**
 * ===================================
 * BATCH PLATE IMPORT ENDPOINT
 * ===================================
 */

/**
 * POST /batch/plate
 * Import vehicle plates from Excel file
 * Processes Excel file containing plate numbers and associates them with personnel
 *
 * @body file - Excel file with columns: plate_number, personnel_code, first_name, last_name, color, brand
 * @returns Array of created car records
 */
router.post(
	'/batch/plate',
	// Security validation for file uploads
	fileUploadSecurityValidation,
	checkIPRestriction,
	accessCheck('dataImportExport'),
	async (req, res) => {
		// Validate file upload
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const files = req.files as any;
		if (!files?.['file']) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result: any[] = [];

			// Load Excel workbook from uploaded file
			const workbook = await new Excel.Workbook().xlsx.load(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(files['file'] as UploadedFile).data as any
			);

			// Get worksheet - try 'cars' sheet first, then first sheet
			const worksheet = workbook.getWorksheet('cars') || workbook.getWorksheet(1);
			if (!worksheet) {
				return res.status(400).json({ error: 'No Sheet present' });
			}

			// Build column mapping from header row
			const columnMap: { [key: string]: number } = {};
			worksheet.getRow(1).eachCell({ includeEmpty: true }, function (cell, colNumber) {
				columnMap[cell.value?.toString().trim() ?? ''] = colNumber;
			});

			// Process each row (skip header row)
			for (const row of worksheet?.getRows(2, worksheet.lastRow?.number ?? 0) ?? []) {
				let plateNumber: string | undefined;
				let personnelCode: string | undefined;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let personnel: any;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let color: any;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let brand: any;
				let firstName: string | undefined;
				let lastName: string | undefined;

				// Validate plate number exists
				if (
					columnMap['plate_number'] &&
					(plateNumber = row.getCell(columnMap['plate_number']).value?.toString())
				) {
					// Add optional fifth column if exists
					plateNumber = columnMap['fifth']
						? plateNumber + (row.getCell(columnMap['fifth']).value ?? '').toString()
						: plateNumber;

					// Normalize Persian characters to English
					const normalizedPlate = stringPersianToStringEnglish(plateNumber);

					// Skip if invalid length or duplicate
					if (normalizedPlate.length !== 8 || (await Car.exists({ number_plate: normalizedPlate }))) {
						continue;
					}

					// Try to find existing personnel by name
					if (
						!(personnel = await Personnel.findOne({
							first_name: row.getCell(columnMap['first_name']).value?.toString(),
							last_name: row.getCell(columnMap['last_name']).value?.toString()
						})
							.lean()
							.exec()) &&
						// If no personnel_code column or empty cell or personnel not found
						(!columnMap['personnel_code'] ||
							!(personnelCode = row.getCell(columnMap['personnel_code']).value?.toString()) ||
							!(personnel = await Personnel.findOne({ personnel_code: personnelCode }).lean().exec()))
					) {
						// Create new personnel if first_name and last_name are provided
						if (
							columnMap['first_name'] &&
							columnMap['last_name'] &&
							(firstName = row.getCell(columnMap['first_name']).value?.toString()) &&
							(lastName = row.getCell(columnMap['last_name']).value?.toString())
						) {
							// Generate random personnel code if not provided
							personnel = await Personnel.create({
								personnel_code:
									personnelCode ??
									Array(10)
										.fill(0)
										.map(() => Math.floor(Math.random() * 10))
										.join(''),
								first_name: firstName,
								last_name: lastName
							});
						} else {
							// Skip if no owner information
							continue;
						}
					}

					// Get car color or default to 'unknown'
					if (
						!columnMap['color'] ||
						!(color = await CarColor.findOne({
							$or: [
								{ name: { $regex: row.getCell(columnMap['color']).value?.toString(), $options: 'i' } },
								{ fa_name: { $regex: row.getCell(columnMap['color']).value?.toString(), $options: 'i' } }
							]
						})
							.lean()
							.exec())
					) {
						color = await CarColor.findOne({ name: 'unknown' }).lean().exec();
					}

					// Get car brand or default to 'unknown'
					if (
						!columnMap['brand'] ||
						!(brand = await CarBrand.findOne({
							$or: [
								{ name: { $regex: row.getCell(columnMap['brand']).value?.toString(), $options: 'i' } },
								{ fa_name: { $regex: row.getCell(columnMap['brand']).value?.toString(), $options: 'i' } }
							]
						})
							.lean()
							.exec())
					) {
						brand = await CarBrand.findOne({ name: 'unknown' }).lean().exec();
					}

					// Create car record
					result.push(
						await Car.create({
							owner: personnel?._id,
							number_plate: normalizedPlate,
							brand: brand?._id,
							color: color?._id
						})
					);
				}
			}

			// Log successful plate batch import
			DataImportExportLogger.plateBatchImported(req, result.length, true);

			res.status(201).json({
				success: true,
				data: result
			});
		} catch (err) {
			// Log failed plate batch import
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			DataImportExportLogger.plateBatchImported(req, 0, false, (err as any).message);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			res.status(500).json({ error: 'Failed to read Excel file', details: (err as any).message });
		}
	}
);

/**
 * ===================================
 * BATCH PERSONNEL IMPORT ENDPOINTS
 * ===================================
 */

/**
 * POST /batch/personnel
 * Batch personnel import - JSON data only (no images)
 * Creates personnel records from JSON array
 *
 * @body personnels - JSON array of personnel objects with fields:
 *   - first_name (required)
 *   - last_name (required)
 *   - personnel_code (required, unique)
 *   - national_code (optional)
 *   - email (optional)
 *   - phone_number (optional)
 *   - job_id (optional)
 *   - tracked (optional)
 *   - camera_whitelist (optional)
 *   - allowed_pass (optional)
 *   - alert (optional)
 * @returns Summary of successful and failed imports
 */
router.post(
	'/batch/personnel',
	// Security validation
	fileUploadSecurityValidation,
	checkIPRestriction,
	accessCheck('dataImportExport'),

	// Controller handles all validation and processing (JSON only, no images)
	batch_personnel_add
);

/**
 * POST /batch/personnel/images
 * Batch upload images for existing personnel with face recognition
 * Includes AI-powered face detection and embedding generation via Kafka
 *
 * @files images - Multipart file uploads (filename must contain personnel_code)
 *   - Filename format: <personnel_code>.<ext> or <personnel_code>_<anything>.<ext>
 *   - Supported formats: jpg, jpeg, png, webp
 * @returns Summary of successful and failed image uploads with face recognition results
 */
// Create multer upload middleware for multiple images with memory storage
const batchPersonnelImagesUploadMiddleware = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 30 * 1024 * 1024 // 30 MB max file size
	},
	fileFilter: (_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
		const isImage = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'].includes(file.mimetype);
		if (isImage) {
			callback(null, true);
		} else {
			callback(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
		}
	}
}).array('images');

router.post(
	'/batch/personnel/images',
	// File upload middleware for multiple images using memory storage
	batchPersonnelImagesUploadMiddleware,

	// Security validation
	fileUploadSecurityValidation,
	checkIPRestriction,
	accessCheck('dataImportExport'),

	// Add Kafka session to request for face recognition
	async (req, _res, next) => {
		// Inject Kafka session function into request body
		req.body.kafkaSession = snapshotKafka.kafkaSession;
		next();
	},

	// Process uploaded images with face recognition
	async (req: Request, res: Response) => {
		try {
			const files = req.files as Express.Multer.File[];
			if (!files || files.length === 0) {
				return res.status(400).json({ success: false, error: 'No images uploaded' });
			}

			const results: {
				successful: Array<{
					filename: string;
					personnel_code: string;
					person_id: string;
					image_id: string;
					has_face: boolean;
				}>;
				failed: Array<{
					filename: string;
					personnel_code?: string;
					error: string;
					multi_face?: boolean;
				}>;
			} = {
				successful: [],
				failed: []
			};

			// Process each uploaded image
			for (const file of files) {
				try {
					// Extract personnel_code from filename (before first dot or underscore)
					const personnelCode = file.originalname.split(/[._]/)[0];

					// Find personnel by code
					const personnel = await Personnel.findOne({ personnel_code: personnelCode }).lean().exec();

					if (!personnel) {
						results.failed.push({
							filename: file.originalname,
							personnel_code: personnelCode,
							error: 'Personnel not found'
						});
						continue;
					}

					// Convert buffer to base64
					const imageBase64 = file.buffer.toString('base64');
					let imageDataUrl = `data:${file.mimetype};base64,${imageBase64}`;

					// Resize if too large
					if (imageBase64.length > 900 * 1024) {
						imageDataUrl = `data:image/jpeg;base64,${await resizeImage(imageDataUrl)}`;
					}

					// Process through Kafka for face recognition
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const faceResult: any = await snapshotKafka.kafkaSession({
						consumerId: personnel._id.toString(),
						consumerKey: 'asghar',
						producerKey: 'soghra',
						producerInput: {
							image_str: imageDataUrl,
							personnel_id: personnel._id.toString()
						}
					});

					if (faceResult?.has_face && faceResult?.cropped_face) {
						// Upload cropped face to S3
						const uploadResult = await uploadBase64ImageToS3(
							faceResult.cropped_face,
							personnel._id.toString(),
							'images/personnel/cropped'
						);

						// Generate hash for PersonImage
						const hash = hashString(faceResult.cropped_face.split(',')[1] || faceResult.cropped_face, SECRET);

						// Save PersonImage record
						const personImage = await PersonImage.create({
							person_id: personnel._id,
							vector: faceResult.embedding,
							hash_id: hash,
							file_key: uploadResult.file_key
						});

						results.successful.push({
							filename: file.originalname,
							personnel_code: personnelCode,
							person_id: personnel._id.toString(),
							image_id: personImage._id.toString(),
							has_face: true
						});
					} else {
						results.failed.push({
							filename: file.originalname,
							personnel_code: personnelCode,
							error: 'No face detected in image',
							multi_face: faceResult?.multi_face || false
						});
					}
				} catch (error) {
					results.failed.push({
						filename: file.originalname,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			return res.status(201).json({
				success: true,
				data: results,
				summary: {
					total: files.length,
					successful: results.successful.length,
					failed: results.failed.length
				}
			});
		} catch (error) {
			return res.status(500).json({
				success: false,
				error: 'Failed to process images',
				details: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
);

/**
 * POST /hostile
 * Create a hostile person record with face recognition
 * Allows specifying name, family, national_code, and optionally processes face images
 *
 * @route POST /hostile
 * @body first_name - First name of the hostile person (optional, defaults to 'Hostile')
 * @body last_name - Last name/family of the hostile person (optional, defaults to generated code)
 * @body national_code - National code of the hostile person (optional)
 * @body personnel_code - Personnel code (optional, auto-generated if not provided)
 * @body tracked - Boolean flag to track this person
 * @body alert - Boolean flag to set alert for this person
 * @body image_str - Base64 encoded image(s) for face recognition (string or array, optional)
 * @returns {Object} 201 - Created hostile person with PersonImage records if images provided
 * @returns {Object} 400 - Bad request if validation fails
 * @security Requires authentication
 */
router.post(
	'/hostile',
	dtoValidationMiddleware(AddHostilePerson, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	injectDataMiddleware(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
		(_body: any) => ({
			code:
				randomUuid(4, 'number').toString() +
				new Date()
					.toLocaleDateString()
					.split('/')
					.map((el) => ('0' + el + '0').slice(-3, -1))
					.join('')
		}),
		{ spread: true }
	),
	createMiddleware(
		[
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ tracked: (body: any) => !!body['tracked'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ alert: (body: any) => !!body['alert'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ first_name: (body: any) => body['first_name'] || 'Hostile' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ last_name: (body: any) => body['last_name'] || body['code'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ national_code: (body: any) => body['national_code'] || '' },
			{ person_type: () => 'hostile' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ personnel_code: (body: any) => body['personnel_code'] || body['code'] }
		],
		Personnel,
		{ save: 'person', next: true }
	),

	async (req, res, next) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const data: any[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const result: any[] = [];
		const person = req.body['person'];

		// If no images provided, return the created person without face processing
		if (!req.body['image_str']) {
			const personData = person.toJSON ? await person.toJSON() : JSON.parse(JSON.stringify(person));
			return res.status(201).json({
				success: true,
				data: personData,
				images: []
			});
		}

		// Ensure image_str is an array
		if (!Array.isArray(req.body['image_str']))
			if (typeof req.body['image_str'] === 'string') req.body['image_str'] = [req.body['image_str']];
			else next(new ApiError(400, 'Bad request!'));
		for (let image_str of req.body['image_str']) {
			image_str =
				image_str?.length > 900 * 1024 ? `data:image/jpeg;base64,${await resizeImage(image_str)}` : image_str;
			data.push(
				await snapshotKafka.kafkaSession({
					consumerId: person?.id,
					consumerKey: 'asghar',
					producerKey: 'soghra',
					producerInput: { image_str, personnel_id: person?.id }
				})
			);
		}
		for (const aiResult of data) {
			if (aiResult?.has_face) {
				try {
					// Extract base64 from data URL if present
					let faceBase64 = aiResult['face'];
					faceBase64 = faceBase64?.split(',')[1] ?? faceBase64;

					// Generate hash for file naming
					const hash = hashString(faceBase64, SECRET);
					const fileName = `${person.id}-${hash}`;
					const fileKey = `images/hostile/${fileName}.jpeg`;

					// Convert base64 to buffer
					const imageBuffer = Buffer.from(faceBase64, 'base64');

					// Upload to S3
					const command = new PutObjectCommand({
						Bucket: BaseConfig.BUCKET_NAME,
						Key: fileKey,
						Body: imageBuffer,
						ContentType: 'image/jpeg',
						ACL: 'public-read',
						CacheControl: 'max-age=31536000'
					});
					await S3Client.instance().send(command);

					// Save to FileModel
					const fileUrl = `${BaseConfig.BUCKET_NAME}/${fileKey}`;
					await new FileCrate().save(
						fileUrl,
						BaseConfig.BUCKET_NAME,
						person.id,
						fileKey,
						imageBuffer.length.toString(),
						'image/jpeg'
					);

					result.push(
						await PersonImage.create({
							_id: aiResult['_id'],
							hash_id: hash,
							file_key: fileKey,
							person_id: person._id,
							vector: aiResult['embedding']
						})
					);
				} catch (error) {
					console.log(error);
				}
			}
		}
		if (!result.length) {
			// If images were provided but no faces detected, still keep the person
			const personData = person.toJSON ? await person.toJSON() : JSON.parse(JSON.stringify(person));
			return res.status(201).json({
				success: true,
				data: personData,
				images: [],
				warning: 'No faces detected in provided images'
			});
		}
		const personData = person.toJSON ? await person.toJSON() : JSON.parse(JSON.stringify(person));
		return res.status(201).json({
			success: true,
			data: personData,
			images: result
		});
	}
);

/**
 * ===================================
 * BATCH HOSTILE PERSON IMPORT ENDPOINTS
 * ===================================
 */

/**
 * POST /batch/hostile
 * Batch hostile person import - JSON data only (no images)
 * Creates hostile person records from JSON array
 *
 * @body hostiles - JSON array of hostile person objects with fields:
 *   - first_name (optional, defaults to 'Hostile')
 *   - last_name (optional, defaults to generated code)
 *   - national_code (optional)
 *   - personnel_code (optional, auto-generated if not provided)
 *   - tracked (optional)
 *   - alert (optional)
 * @returns Summary of successful and failed imports
 */
router.post(
	'/batch/hostile',
	// Security validation
	fileUploadSecurityValidation,
	checkIPRestriction,
	accessCheck('dataImportExport'),

	async (req: Request, res: Response) => {
		try {
			const hostiles = req.body.hostiles;

			if (!hostiles || !Array.isArray(hostiles)) {
				return res.status(400).json({
					success: false,
					error: 'hostiles array is required'
				});
			}

			const results: {
				successful: Array<{
					first_name: string;
					last_name: string;
					national_code: string;
					personnel_code: string;
					_id: string;
				}>;
				failed: Array<{
					index: number;
					data: unknown;
					error: string;
				}>;
			} = {
				successful: [],
				failed: []
			};

			for (let i = 0; i < hostiles.length; i++) {
				const hostile = hostiles[i];
				try {
					// Generate unique code for this hostile person
					const code =
						randomUuid(4, 'number').toString() +
						new Date()
							.toLocaleDateString()
							.split('/')
							.map((el: string) => ('0' + el + '0').slice(-3, -1))
							.join('') +
						i.toString().padStart(3, '0');

					// Create hostile person record
					const person = await Personnel.create({
						first_name: hostile.first_name || 'Hostile',
						last_name: hostile.last_name || code,
						national_code: hostile.national_code || '',
						personnel_code: hostile.personnel_code || code,
						person_type: 'hostile',
						tracked: !!hostile.tracked,
						alert: !!hostile.alert
					});

					results.successful.push({
						first_name: person.first_name,
						last_name: person.last_name,
						national_code: person.national_code,
						personnel_code: person.personnel_code,
						_id: person._id.toString()
					});
				} catch (error) {
					results.failed.push({
						index: i,
						data: hostile,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			// Log the batch import
			DataImportExportLogger.batchPersonnelImported(
				req,
				results.successful.length,
				results.failed.length,
				true
			);

			return res.status(201).json({
				success: true,
				data: results,
				summary: {
					total: hostiles.length,
					successful: results.successful.length,
					failed: results.failed.length
				}
			});
		} catch (error) {
			DataImportExportLogger.batchPersonnelImported(
				req,
				0,
				0,
				false,
				error instanceof Error ? error.message : 'Unknown error'
			);
			return res.status(500).json({
				success: false,
				error: 'Failed to process batch hostile import',
				details: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
);

/**
 * POST /batch/hostile/images
 * Batch upload images for existing hostile persons with face recognition
 * Includes AI-powered face detection and embedding generation via Kafka
 *
 * @files images - Multipart file uploads (filename must contain personnel_code)
 *   - Filename format: <personnel_code>.<ext> or <personnel_code>_<anything>.<ext>
 *   - Supported formats: jpg, jpeg, png, webp
 * @returns Summary of successful and failed image uploads with face recognition results
 */
// Create multer upload middleware for multiple hostile images with memory storage
const batchHostileImagesUploadMiddleware = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 30 * 1024 * 1024 // 30 MB max file size
	},
	fileFilter: (_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
		const isImage = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'].includes(file.mimetype);
		if (isImage) {
			callback(null, true);
		} else {
			callback(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
		}
	}
}).array('images');

router.post(
	'/batch/hostile/images',
	// File upload middleware for multiple images using memory storage
	batchHostileImagesUploadMiddleware,

	// Security validation
	fileUploadSecurityValidation,
	checkIPRestriction,
	accessCheck('dataImportExport'),

	// Process uploaded images with face recognition
	async (req: Request, res: Response) => {
		try {
			const files = req.files as Express.Multer.File[];
			if (!files || files.length === 0) {
				return res.status(400).json({ success: false, error: 'No images uploaded' });
			}

			const results: {
				successful: Array<{
					filename: string;
					personnel_code: string;
					person_id: string;
					image_id: string;
					has_face: boolean;
				}>;
				failed: Array<{
					filename: string;
					personnel_code?: string;
					error: string;
					multi_face?: boolean;
				}>;
			} = {
				successful: [],
				failed: []
			};

			// Process each uploaded image
			for (const file of files) {
				try {
					// Extract personnel_code from filename (before first dot or underscore)
					const personnelCode = file.originalname.split(/[._]/)[0];

					// Find hostile person by code
					const personnel = await Personnel.findOne({
						personnel_code: personnelCode,
						person_type: 'hostile'
					})
						.lean()
						.exec();

					if (!personnel) {
						results.failed.push({
							filename: file.originalname,
							personnel_code: personnelCode,
							error: 'Hostile person not found'
						});
						continue;
					}

					// Convert buffer to base64
					const imageBase64 = file.buffer.toString('base64');
					let imageDataUrl = `data:${file.mimetype};base64,${imageBase64}`;

					// Resize if too large
					if (imageBase64.length > 900 * 1024) {
						imageDataUrl = `data:image/jpeg;base64,${await resizeImage(imageDataUrl)}`;
					}

					// Process through Kafka for face recognition
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const faceResult: any = await snapshotKafka.kafkaSession({
						consumerId: personnel._id.toString(),
						consumerKey: 'asghar',
						producerKey: 'soghra',
						producerInput: {
							image_str: imageDataUrl,
							personnel_id: personnel._id.toString()
						}
					});

					if (faceResult?.has_face && faceResult?.face) {
						// Upload face to S3
						const faceBase64 = faceResult.face;
						const uploadResult = await uploadBase64ImageToS3(
							faceBase64,
							personnel._id.toString(),
							'images/hostile'
						);

						// Generate hash for PersonImage
						const hash = hashString(faceBase64.split(',')[1] || faceBase64, SECRET);

						// Save PersonImage record
						const personImage = await PersonImage.create({
							person_id: personnel._id,
							vector: faceResult.embedding,
							hash_id: hash,
							file_key: uploadResult.file_key
						});

						results.successful.push({
							filename: file.originalname,
							personnel_code: personnelCode,
							person_id: personnel._id.toString(),
							image_id: personImage._id.toString(),
							has_face: true
						});
					} else {
						results.failed.push({
							filename: file.originalname,
							personnel_code: personnelCode,
							error: 'No face detected in image',
							multi_face: faceResult?.multi_face || false
						});
					}
				} catch (error) {
					results.failed.push({
						filename: file.originalname,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}

			return res.status(201).json({
				success: true,
				data: results,
				summary: {
					total: files.length,
					successful: results.successful.length,
					failed: results.failed.length
				}
			});
		} catch (error) {
			return res.status(500).json({
				success: false,
				error: 'Failed to process images',
				details: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}
);

/**
 * POST /search
 * Search for personnel by face image
 * Uses AI face recognition to match image against database vectors
 *
 * @route POST /search
 * @files image - Image file upload via multipart form data (auto-resized if > 900KB)
 * @body confidence - Optional confidence threshold for matches
 * @returns {Object} 200 - Array of matched personnel records
 * @returns {Object} 406 - No face found in the image
 * @security Requires authentication
 */
// Create multer upload middleware for memory storage (no S3 upload)
const searchUploadMiddleware = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 30 * 1024 * 1024 // 30 MB max file size
	},
	fileFilter: (_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
		const isImage = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'].includes(file.mimetype);
		if (isImage) {
			callback(null, true);
		} else {
			callback(new Error(`Invalid file type: ${file.mimetype}. Only images are allowed.`));
		}
	}
}).single('image');

router.post(
	'/search',
	searchUploadMiddleware,
	// Convert uploaded file buffer to base64 for processing
	async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (req.file) {
				// Convert buffer directly to base64 (no S3 upload/download)
				const imageBase64 = req.file.buffer.toString('base64');
				req.body['image_str'] = `data:${req.file.mimetype};base64,${imageBase64}`;
			}
			next();
		} catch (error) {
			next(error);
		}
	},
	(req: Request, res: Response, next: NextFunction) => {
		req.body.id = randomUuid(24);
		return next();
	},
	snapshotKafka.middlewareWraper(
		snapshotKafka.kafkaSession,
		async (req) => {
			const image_str =
				req.body['image_str']?.length > 900 * 1024
					? `data:image/jpeg;base64,${await resizeImage(req.body['image_str'])}`
					: req.body['image_str'];
			req.body['image_str'] = image_str;
			return [
				{
					producerKey: 'akbar',
					consumerKey: 'kobra',
					producerInput: ['image_str', 'confidence', 'id'].reduce(
						(o, k) => Object.assign(o, { [k]: req.body[k] }),
						{}
					),
					consumerId: req.body['id']
				}
			];
		},
		{ save: 'redisData', next: true }
	),
	// Store Kafka response and fetch personnel data
	async (req: Request, _res: Response, next: NextFunction) => {
		try {
			// Save the Kafka response with match details
			const kafkaResponse = req.body['redisData'];

			// Debug: Log the Kafka response
			console.log('Kafka Response:', JSON.stringify(kafkaResponse, null, 2));

			req.body['kafkaSearchResult'] = kafkaResponse;

			// Handle two different Kafka response formats:
			// Format 1 (new): { matches: [{id, image_id, conf}, ...], has_face, multi_face }
			// Format 2 (old): { timestamp, data: [id1, id2, ...] }
			let ids: string[] = [];

			if (kafkaResponse?.matches && Array.isArray(kafkaResponse.matches)) {
				// New format with matches array
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				ids = [...new Set(kafkaResponse.matches.map((m: any) => m.id))] as string[];
			} else if (kafkaResponse?.data && Array.isArray(kafkaResponse.data)) {
				// Old format with data array
				ids = [...new Set(kafkaResponse.data)] as string[];
			}

			console.log('Extracted IDs:', ids);

			// Fetch personnel records if we have IDs
			if (ids.length > 0) {
				const personnelDocs = await Personnel.find({ _id: { $in: ids } })
					.populate('job_id')
					.exec();

				// Convert to JSON to include avatar URLs
				req.body['personnelData'] = await Promise.all(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					personnelDocs.map(async (p: any) => await p.toJSON())
				);

				console.log('Found personnel records:', personnelDocs.length);
			} else {
				req.body['personnelData'] = [];
			}

			next();
		} catch (error) {
			console.error('Error in search middleware:', error);
			next(error);
		}
	},
	//error check and response
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	(req: Request, res: Response, _next: NextFunction) => {
		const kafkaResponse = req.body['kafkaSearchResult'];
		const personnelRecords = req.body['personnelData'] || [];

		console.log('Final kafkaResponse:', JSON.stringify(kafkaResponse, null, 2));
		console.log('has_face:', kafkaResponse?.has_face);
		console.log('matches length:', kafkaResponse?.matches?.length);
		console.log('data length:', kafkaResponse?.data?.length);

		// Check if we have results (support both formats)
		const hasMatches = kafkaResponse?.matches && kafkaResponse.matches.length > 0;
		const hasData = kafkaResponse?.data && kafkaResponse.data.length > 0;

		if (!hasMatches && !hasData) {
			return res.status(406).send({
				message: 'No face found or no matching personnel',
				has_face: kafkaResponse?.has_face || false,
				multi_face: kafkaResponse?.multi_face || false
			});
		}

		// Build response based on format
		if (kafkaResponse?.matches) {
			// New format with detailed match information
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const results = kafkaResponse.matches.map((match: any) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const personnel = personnelRecords.find((p: any) => p._id?.toString() === match.id);
				return {
					...(personnel || { _id: match.id, not_found: true }),
					match_details: {
						image_id: match.image_id,
						confidence: parseFloat(match.conf)
					}
				};
			});

			return res.status(200).send({
				success: true,
				data: {
					has_face: kafkaResponse.has_face,
					multi_face: kafkaResponse.multi_face,
					total_matches: kafkaResponse.matches.length,
					results: results
				}
			});
		} else {
			// Old format - just return personnel records
			return res.status(200).send({
				success: true,
				data: personnelRecords
			});
		}
	}
);

/**
 * POST /notifpersonnel/guest
 * Create a guest personnel record with automatic code generation
 * Guest personnel get special job title and allowed pass time
 *
 * @route POST /notifpersonnel/guest
 * @body allowed_pass - Optional time range for guest access
 * @returns {Object} 201 - Created guest personnel with person_id
 * @returns {Object} 412 - Validation failed
 * @security Requires authentication
 */
router.post(
	'/notifpersonnel/guest',
	injectDataMiddleware(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		async (): Promise<any> => ({
			code:
				randomUuid(4, 'number').toString() +
				new Date()
					.toLocaleDateString()
					.split('/')
					.map((el) => ('0' + el + '0').slice(-3, -1))
					.join(''),
			guestId: await JobTitle.findOne({ name: 'guest' })
				.exec()
				.then((job) => job?.id)
		}),
		{ spread: true }
	),
	createMiddleware(
		[
			{ guest: () => true },
			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				allowed_pass: (body: any) => allowedPassConvert(body) ?? { start: 0, end: 2147483648000 }
			},
			{ first_name: () => 'Guest' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ last_name: (body: any) => body['code'] },
			{ person_type: () => 'guest' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ personnel_code: (body: any) => body['code'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ job_id: (body: any) => body['guestId'] }
		],
		Personnel,
		{ save: 'person', next: true }
	),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	injectDataMiddleware((body: any) => ({ person_id: body.person?.id }), {
		spread: true
	})
);

/**
 * POST /notifpersonnel/client
 * Create a client personnel record with associated product
 * Automatically assigns client job title and camera whitelist
 *
 * @route POST /notifpersonnel/client
 * @body first_name - Client's first name (required)
 * @body last_name - Client's last name (required)
 * @body client_type - Type of client: 'client_buyer' or 'client_seller' (required)
 * @body phone_number - Client's phone number (required)
 * @body product_name - Name of the product (optional, defaults to 'طلا')
 * @body product_images - Array of product images (optional)
 * @body product_weight - Weight of the product (optional)
 * @body face_log_id - Associated face log ID (optional)
 * @returns {Object} 201 - Created client personnel and product records
 * @returns {Object} 412 - Validation failed
 * @security Requires authentication
 */
router.post(
	'/notifpersonnel/client',
	dtoValidationMiddleware(AddClient, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	createMiddleware(
		[
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ first_name: (body: any) => body['first_name'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ last_name: (body: any) => body['last_name'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ person_type: (body: any) => body['client_type'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ phone_number: (body: any) => body['phone_number'] },
			{ alert: () => false },
			{
				personnel_code: () =>
					randomUuid(4, 'number').toString() +
					new Date()
						.toLocaleDateString()
						.split('/')
						.map((el) => ('0' + el + '0').slice(-3, -1))
						.join('')
			},
			{
				job_id: async () =>
					await JobTitle.findOne({ name: 'client' })
						.exec()
						.then((job) => job?.id)
			},
			{
				camera_whitelist: async () =>
					await Camera.find({})
						.exec()
						.then((cameras) => cameras.map((cam) => cam._id))
			}
		],
		Personnel,
		{ save: 'person', next: true }
	),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	injectDataMiddleware((body: any) => ({ person_id: body.person?.id }), {
		spread: true
	}),
	createMiddleware(
		[
			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				name: (body: any) => (body['product_name'] ? body['product_name'] : 'طلا')
			},
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ images: (body: any) => body['product_images'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ product_code: (body: any) => body['person']['personnel_code'] },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ person_id: (body: any) => body['person']['_id'] },
			'face_log_id',
			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				features: (body: any) => [{ name: 'product_weight', value: body['product_weight'] ?? 0 }]
			}
		],
		Product,
		{ next: true, save: 'product' }
	),
	injectDataMiddleware(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(body: any) => ({
			first_name: body['first_name'],
			last_name: body['last_name'],
			client_type: body['client_type'],
			phone_number: body['phone_number'],
			product_images: body['product_images'],
			product_name: body['product_name'],
			product_weight: body['product_weight']
		}),
		{ injData: 'sendings' }
	)
);

/**
 * POST /notifpersonnel/:type?
 * Add person image with face vector notification
 * Processes image through Kafka (habil→ghabil) and saves to PersonImage collection
 *
 * @route POST /notifpersonnel/:type?
 * @param type - Optional personnel type parameter
 * @body person_id - ID of the personnel (required)
 * @body vector - Face embedding vector (required)
 * @body hash_id - Hash of the image (required)
 * @body image_str - Base64 encoded image string (required)
 * @body confidence - Face detection confidence score (optional)
 * @returns {Object} 201 - Created PersonImage with image data
 * @returns {Object} 400 - AI processing failed or validation error
 * @returns {Object} 412 - Validation failed
 * @security Requires authentication
 */
router.post(
	'/notifpersonnel/:type?',
	dtoValidationMiddleware(AddPersonImage, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
	injectDataMiddleware((_body: any) => ({ _id: new mongoose.Types.ObjectId().toHexString() }), {
		spread: true
	}),

	snapshotKafka.middlewareWraper(
		snapshotKafka.kafkaSession,
		(req) => [
			{
				producerKey: 'habil',
				consumerKey: 'ghabil',
				producerInput: ['person_id', 'vector', 'hash_id', 'confidence', '_id'].reduce(
					(o, k) => Object.assign(o, { [k]: req.body[k] }),
					{}
				),
				consumerId: 'undefined' // req.body["person_id"]
			}
		],
		{
			save: 'aiResponse',
			next: true,
			resultValidationFunction: (result) =>
				!result?.success ? { status: 400, message: result?.message } : undefined
		}
	),
	// Save base64 image to S3 (for Kafka integration)
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const image_str = req.body.image_str;
			const person_id = req.body.person_id;

			if (image_str && person_id) {
				const result = await uploadBase64ImageToS3(image_str, person_id, 'images/personnel');
				req.body.uploaded_file = result;
			}
			next();
		} catch (error) {
			next(error);
		}
	},
	injectDataMiddleware(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(body: any) => ({
			file_key: body['uploaded_file']?.file_key || ''
		}),
		{ spread: true }
	),
	//create PersonImage document
	createMiddleware(['person_id', 'vector', 'hash_id', 'confidence', 'file_key', '_id'], PersonImage, {
		next: true,
		save: 'imageDoc'
	}),
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	(req: Request, res: Response, _next: NextFunction) => {
		res.status(201).send({
			success: true,
			data: {
				...req?.body?.imageDoc?.toJSON(),
				image_str: req?.body?.image_str,
				...req.body['sendings']
			}
		});
	}
);

export default router;
