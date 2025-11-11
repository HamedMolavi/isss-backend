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
import { readMiddleware } from '../../db/mongo/read.database';

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
import { file_upload } from '../../file_upload/aws/upload';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import S3Client from '../../config/s3.config';
import { BaseConfig } from '../../config/base.config';
import { FileCrate } from '../../file_upload/methods/file/file_create';
import { downloadS3FileAsBase64 } from '../../tools/s3.tools';

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
		if (!req.files?.['file']) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const result: any[] = [];

			// Load Excel workbook from uploaded file
			const workbook = await new Excel.Workbook().xlsx.load(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(req.files?.['file'] as UploadedFile).data as any
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
 * BATCH PERSONNEL IMPORT ENDPOINT
 * ===================================
 */

/**
 * POST /batch/personnel
 * Batch personnel import with face recognition - reads from request body
 * Includes AI-powered face detection and embedding generation via Kafka
 *
 * @body personnels - JSON string array of personnel objects with fields:
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
 * @files images - Multipart file uploads (matched by personnel_code in filename or order)
 * @returns Summary of successful and failed imports with face recognition results
 */
router.post(
	'/batch/personnel',
	// File upload middleware for multiple images
	file_upload().array('images'),

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

	// Controller handles all validation and processing (including face recognition)
	batch_personnel_add
);

/**
 * POST /hostile
 * Create a hostile person record with face recognition
 * Automatically generates personnel code and processes face images
 *
 * @route POST /hostile
 * @body tracked - Boolean flag to track this person
 * @body alert - Boolean flag to set alert for this person
 * @body image_str - Base64 encoded image(s) for face recognition (string or array)
 * @returns {Object} 201 - Created PersonImage records with face data
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
			{ first_name: () => 'Hostile' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ last_name: (body: any) => body['code'] },
			{ person_type: () => 'hostile' },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			{ personnel_code: (body: any) => body['code'] }
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
					const fileKey = `images/personnel/${fileName}.jpeg`;

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
		if (!result.length) await person.delete();
		return res.status(201).json({
			success: true,
			data: result
		});
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
router.post(
	'/search',
	file_upload().single('image'),
	// Convert uploaded file to base64 for processing
	async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (req.file) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const uploadedFile = req.file as any;
				// Download from S3 and convert to base64
				const imageBase64 = await downloadS3FileAsBase64(uploadedFile.key);
				req.body['image_str'] = `data:${uploadedFile.mimetype};base64,${imageBase64}`;
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
	readMiddleware(
		Personnel,
		(redisDateStringified) => {
			try {
				const ids: Array<string> = JSON.parse(redisDateStringified);
				return { person_id: { $in: ids } };
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (_error) {
				// If JSON parsing fails, return empty query to avoid errors
				return {};
			}
		},
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		{ searchFromBody: (body: any) => (body.redisData ? JSON.stringify(body.redisData) : ''), populate: true }
	),
	//error check
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	(req: Request, res: Response, _next: NextFunction) =>
		req.body['redisData']?.has_face == true
			? res.status(406).send({ message: 'No face found' })
			: res.status(200).send({
					success: true,
					data: req.body.redisData ?? ''
				})
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
