import { PutObjectCommand } from '@aws-sdk/client-s3';
import S3Client from '../config/s3.config';
import { BaseConfig } from '../config/base.config';
import { v4 } from 'uuid';
import { Logger } from '../logger';
import { FileCrate } from '../file_upload/methods/file/file_create';
import Validator from 'validatorjs';
import { Request, Response } from 'express';
import { ApiRes } from '../utils/api.response';
import Personnel from '../db/mongo/models/personnel';
import PersonImage from '../db/mongo/models/personImage';
import mongoose from 'mongoose';
import { hashString } from '../tools/hash';
import { resizeImage } from '../tools/utils.tools';
import Car from '../db/mongo/models/car';
import CarBrand from '../db/mongo/models/carBrand';
import CarColor from '../db/mongo/models/carColor';
import { stringPersianToStringEnglish, stringPlateToJson } from '../tools/plate.tools';
import { DataImportExportLogger } from '../logger/data-input-output.logger';
import { normalizeNumericText, normalizePersonnelText } from '../validation/personnel.validation';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILE_SIZE_MB } from '../config/upload.config';

const SECRET = process.env['SESSION_SECRET'];

const escapeRegexValue = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Process face recognition for a base64 image using Kafka
 * Sends image to AI service and receives face embedding vectors
 *
 * @param base64Image - Base64 encoded image string
 * @param personnelId - ID of the personnel
 * @param kafkaSession - Kafka session function from SnapshotKafka
 * @returns Face recognition result with embedding vector
 */
export const processFaceRecognition = async (
	base64Image: string,
	personnelId: string,
	kafkaSession: (params: {
		producerKey: string;
		consumerKey: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		producerInput: any;
		consumerId: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	}) => Promise<any>
): Promise<{
	has_face: boolean;
	embedding?: number[];
	_id: string;
	multi_face?: boolean;
	cropped_face?: string;
}> => {
	try {
		// Resize image if too large (over 900KB)
		let imageStr = base64Image;
		if (imageStr.length > 900 * 1024) {
			imageStr = `data:image/jpeg;base64,${await resizeImage(imageStr)}`;
		}

		// Send to Kafka for face recognition processing
		const aiResult = await kafkaSession({
			producerKey: 'soghra',
			consumerKey: 'asghar',
			producerInput: { personnel_id: personnelId, image_str: imageStr },
			consumerId: personnelId
		});

		// Check if Kafka returned an error (timeout or no response)
		if (aiResult?.error) {
			const isTimeout = aiResult.timeout === true;
			const errorType = isTimeout ? 'kafka_timeout' : 'kafka_error';

			Logger.error('Kafka session returned error', {
				personnel_id: personnelId,
				error: aiResult.error,
				error_type: errorType,
				timeout: isTimeout
			});

			throw new Error(aiResult.error);
		}

		// Log the raw AI response for debugging
		Logger.debug('AI service response received', {
			personnel_id: personnelId,
			has_cropped_embs: Boolean(aiResult?.cropped_embs),
			cropped_embs_type: aiResult?.cropped_embs ? typeof aiResult.cropped_embs : 'undefined',
			is_array: Array.isArray(aiResult?.cropped_embs),
			cropped_embs_length: aiResult?.cropped_embs?.length,
			has_face_flag: aiResult?.has_face,
			has_embedding_field: Boolean(aiResult?.embedding),
			embedding_length: aiResult?.embedding?.length,
			has_cropped_face: Boolean(aiResult?.cropped_face),
			cropped_face_length: aiResult?.cropped_face ? aiResult.cropped_face.length : 0,
			response_keys: aiResult ? Object.keys(aiResult) : []
		});

		// AI service returns cropped_embs array when face is detected
		// has_face may be 0 (integer) even when face is found, so check for embedding array
		// Note: Some responses may have 'embedding' instead of 'cropped_embs'
		const embeddingArray = aiResult?.cropped_embs || aiResult?.embedding;
		const hasFaceDetected = Boolean(
			embeddingArray && Array.isArray(embeddingArray) && embeddingArray.length > 0
		);

		// Ensure cropped_face is returned from asghar consumer response
		const croppedFaceImage = aiResult?.cropped_face;

		return {
			has_face: hasFaceDetected,
			embedding: embeddingArray, // Use cropped_embs or embedding from AI response
			_id: aiResult?._id,
			multi_face: aiResult?.multi_face,
			cropped_face: croppedFaceImage // Cropped face image from asghar Kafka response
		};
	} catch (error) {
		Logger.error('Error in processFaceRecognition', {
			error: error instanceof Error ? error.message : String(error),
			personnel_id: personnelId
		});
		throw new Error('Failed to process face recognition');
	}
};

/**
 * Save PersonImage record with face embedding vector
 * Creates PersonImage document and uploads cropped face image to S3
 *
 * @param personnelId - Personnel MongoDB ObjectId
 * @param croppedFace - Base64 encoded cropped face image from AI
 * @param faceVector - Face embedding vector from AI
 * @param imageId - Unique image ID from AI service
 * @returns Created PersonImage record with file info
 */
export const savePersonImageWithVector = async (
	personnelId: string,
	croppedFace: string,
	faceVector: number[],
	imageId: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
	try {
		// Remove data URL prefix if present
		let imageStr = croppedFace;
		if (imageStr.includes(',')) {
			imageStr = imageStr.split(',')[1];
		}

		// Generate hash ID for the image
		const hashId = hashString(imageStr, SECRET);

		// Check if image already exists
		const existingPersonImage = await PersonImage.findOne({ hash_id: hashId }).exec();

		if (existingPersonImage) {
			throw new Error('Image with this hash already exists');
		}

		// Upload cropped face image to S3
		const uploadResult = await uploadBase64ImageToS3(croppedFace, personnelId, 'images/personnel/cropped');

		// Create PersonImage document
		const personImage = new PersonImage({
			_id: imageId || new mongoose.Types.ObjectId().toHexString(),
			person_id: personnelId,
			hash_id: hashId,
			vector: faceVector,
			file_key: uploadResult.file_key
		});

		await personImage.save();

		Logger.debug('PersonImage saved successfully with cropped face', {
			personnel_id: personnelId,
			image_id: personImage._id,
			file_key: uploadResult.file_key
		});

		return {
			...personImage.toObject(),
			file_url: uploadResult.file_url,
			size: uploadResult.size
		};
	} catch (error) {
		Logger.error('Error in savePersonImageWithVector', {
			error: error instanceof Error ? error.message : String(error),
			personnel_id: personnelId
		});
		throw error;
	}
};

/**
 * Controller to upload base64 image to S3 (for backward compatibility with Kafka)
 * Converts base64 to buffer then uploads to S3
 *
 * @param base64Image - Base64 encoded image string (with or without data URL prefix)
 * @param personId - ID of the person
 * @param folder - Optional folder path (default: 'images/personnel')
 * @returns Object with file_key and file_url
 */
export const uploadBase64ImageToS3 = async (
	base64Image: string,
	personId: string,
	folder: string = 'images/personnel'
): Promise<{ file_key: string; file_url: string; size: number }> => {
	try {
		Logger.debug('uploadBase64ImageToS3 called', {
			person_id: personId,
			folder: folder,
			image_length: base64Image?.length,
			image_starts_with: base64Image?.substring(0, 50),
			has_data_prefix: base64Image?.includes('data:')
		});

		// Remove data URL prefix if present
		let imageStr = base64Image;
		if (imageStr.includes(',')) {
			imageStr = imageStr.split(',')[1];
		}

		// Convert base64 to buffer
		const imageBuffer = Buffer.from(imageStr, 'base64');
		if (imageBuffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
			throw new Error(`Image is too large. Maximum allowed: ${MAX_UPLOAD_FILE_SIZE_MB}MB.`);
		}

		Logger.debug('Image buffer created', {
			buffer_length: imageBuffer.length,
			folder: folder
		});

		// Generate unique filename
		const fileName = `${personId}-${v4()}`;
		const ext = '.jpeg';

		// Build S3 key path
		const fileKey = `${folder}/${fileName}${ext}`;

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

		// Construct file URL
		const fileUrl = `${BaseConfig.BUCKET_NAME}/${fileKey}`;

		// Save to FileModel database
		await new FileCrate().save(
			fileUrl,
			BaseConfig.BUCKET_NAME,
			personId,
			fileKey,
			imageBuffer.length.toString(),
			'image/jpeg'
		);

		Logger.debug('Base64 image uploaded successfully', {
			person_id: personId,
			file_key: fileKey,
			size: imageBuffer.length,
			folder: folder
		});

		return {
			file_key: fileKey,
			file_url: fileUrl,
			size: imageBuffer.length
		};
	} catch (error) {
		Logger.error('Error in uploadBase64ImageToS3', {
			error: error instanceof Error ? error.message : String(error),
			person_id: personId,
			folder: folder
		});
		throw new Error('Failed to upload base64 image to S3');
	}
};

export const batch_plate_add = async (req: Request, res: Response) => {
	try {
		let plates;
		try {
			plates = typeof req.body.plates === 'string' ? JSON.parse(req.body.plates) : req.body.plates;
		} catch {
			return ApiRes(res, {
				status: 400,
				msg: 'Invalid plates data format. Expected JSON array.'
			});
		}

		const validate = new Validator(
			{
				plates
			},
			{
				plates: ['required', 'array']
			}
		);

		if (validate.fails()) {
			return ApiRes(res, {
				status: 412,
				msg: JSON.stringify(validate.errors.all())
			});
		}

		const fallbackColor = await CarColor.findOne({ name: { $regex: '^unknown$', $options: 'i' } }).lean().exec();
		const fallbackBrand = await CarBrand.findOne({ name: { $regex: '^unknown$', $options: 'i' } }).lean().exec();

		const results: Array<{
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			car: any;
		}> = [];
		const errors: Array<{
			index: number;
			plate_number: string;
			personnel_code?: string;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			errors?: any;
			error?: string;
		}> = [];

		const inRequestSeenPlate = new Set<string>();

		for (let i = 0; i < plates.length; i++) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const plate = plates[i] as any;
			const rawPlateNumber = String(plate?.plate_number ?? '').trim();
			const personnelCode = String(plate?.personnel_code ?? '').trim();

			const rowValidate = new Validator(
				{
					plate_number: rawPlateNumber,
					personnel_code: personnelCode,
					brand: plate?.brand,
					color: plate?.color
				},
				{
					plate_number: ['required', 'string'],
					personnel_code: ['required', 'string'],
					brand: ['string'],
					color: ['string']
				}
			);

			if (rowValidate.fails()) {
				errors.push({
					index: i,
					plate_number: rawPlateNumber,
					personnel_code: personnelCode || undefined,
					errors: rowValidate.errors.all()
				});
				continue;
			}

			try {
				const normalizedPlate = stringPersianToStringEnglish(rawPlateNumber, { forceValidation: true });
				if (!normalizedPlate || normalizedPlate.length !== 8) {
					errors.push({
						index: i,
						plate_number: rawPlateNumber,
						personnel_code: personnelCode,
						error: 'Invalid plate number format - expected a valid 8-character plate'
					});
					continue;
				}

				if (inRequestSeenPlate.has(normalizedPlate)) {
					errors.push({
						index: i,
						plate_number: rawPlateNumber,
						personnel_code: personnelCode,
						error: 'Duplicate plate number in request payload - skipped'
					});
					continue;
				}

				const existingCar = await Car.findOne({ number_plate: normalizedPlate }).lean().exec();
				if (existingCar) {
					errors.push({
						index: i,
						plate_number: rawPlateNumber,
						personnel_code: personnelCode,
						error: 'Car with this plate number already exists - skipped'
					});
					continue;
				}

				const owner = await Personnel.findOne({ personnel_code: personnelCode }).lean().exec();
				if (!owner?._id) {
					errors.push({
						index: i,
						plate_number: rawPlateNumber,
						personnel_code: personnelCode,
						error: 'Personnel not found for provided personnel_code - skipped'
					});
					continue;
				}

				const colorInput = String(plate?.color ?? '').trim();
				const brandInput = String(plate?.brand ?? '').trim();

				const color =
					(colorInput
						? await CarColor.findOne({
								$or: [
									{ name: { $regex: escapeRegexValue(colorInput), $options: 'i' } },
									{ fa_name: { $regex: escapeRegexValue(colorInput), $options: 'i' } }
								]
							})
								.lean()
								.exec()
						: null) ?? fallbackColor;

				const brand =
					(brandInput
						? await CarBrand.findOne({
								$or: [
									{ name: { $regex: escapeRegexValue(brandInput), $options: 'i' } },
									{ fa_name: { $regex: escapeRegexValue(brandInput), $options: 'i' } }
								]
							})
								.lean()
								.exec()
						: null) ?? fallbackBrand;

				if (!color?._id || !brand?._id) {
					errors.push({
						index: i,
						plate_number: rawPlateNumber,
						personnel_code: personnelCode,
						error: 'Car color/brand resolution failed and fallback unknown values are missing - skipped'
					});
					continue;
				}

				const newCar = await Car.create({
					owner: owner._id,
					number_plate: normalizedPlate,
					brand: brand._id,
					color: color._id
				});

				inRequestSeenPlate.add(normalizedPlate);
				results.push({
					car: {
						_id: newCar._id,
						owner: newCar.owner,
						personnel_code: personnelCode,
						number_plate: stringPlateToJson(newCar.number_plate),
						brand: newCar.brand,
						color: newCar.color
					}
				});
			} catch (error) {
				Logger.error('Error creating car in batch plate import - continuing to next', {
					index: i,
					plate_number: rawPlateNumber,
					personnel_code: personnelCode,
					error: error instanceof Error ? error.message : String(error)
				});
				errors.push({
					index: i,
					plate_number: rawPlateNumber,
					personnel_code: personnelCode,
					error: error instanceof Error ? error.message : 'Unknown error occurred'
				});
				continue;
			}
		}

		const summary = {
			total: plates.length,
			successful: results.length,
			failed: errors.length,
			summary_message: `Processed ${plates.length} plates: ${results.length} successful, ${errors.length} failed/skipped`
		};

		DataImportExportLogger.plateBatchImported(req, results.length, true);
		Logger.debug('Batch plate import completed', summary);

		return ApiRes(res, {
			status: 201,
			data: {
				...summary,
				results,
				errors: errors.length > 0 ? errors : undefined
			}
		});
	} catch (error) {
		Logger.error('Error in batch_plate_add', {
			error: error instanceof Error ? error.message : String(error)
		});
		DataImportExportLogger.plateBatchImported(
			req,
			0,
			false,
			error instanceof Error ? error.message : 'Unknown error'
		);
		return ApiRes(res, {
			status: 500,
			msg: 'Internal server error during batch plate import'
		});
	}
};

export const batch_personnel_add = async (req: Request, res: Response) => {
	try {
		// Parse personnels from body (could be JSON string or already parsed)
		let personnels;
		try {
			personnels =
				typeof req.body.personnels === 'string' ? JSON.parse(req.body.personnels) : req.body.personnels;
		} catch {
			return ApiRes(res, {
				status: 400,
				msg: 'Invalid personnels data format. Expected JSON array.'
			});
		}

		// Validate main payload
		const validate = new Validator(
			{
				personnels: personnels
			},
			{
				personnels: ['required', 'array']
			}
		);

		if (validate.fails()) {
			return ApiRes(res, {
				status: 412,
				msg: JSON.stringify(validate.errors.all())
			});
		}

		const results: Array<{
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			personnel: any;
		}> = [];
		const errors: Array<{
			index: number;
			personnel_code: string;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			errors?: any;
			error?: string;
		}> = [];

		// Process each personnel in the batch
		for (let i = 0; i < personnels.length; i++) {
			const person = personnels[i];
			const firstName = normalizePersonnelText(person.first_name);
			const lastName = normalizePersonnelText(person.last_name);
			const nationalCode = normalizePersonnelText(person.national_code);
			const email = normalizePersonnelText(person.email);
			const phoneNumber = normalizePersonnelText(person.phone_number);
			const personnelCode = normalizeNumericText(person.personnel_code);

			// Validate individual personnel data
			const personValidate = new Validator(
				{
					first_name: firstName,
					last_name: lastName,
					national_code: nationalCode,
					email,
					phone_number: phoneNumber,
					job_id: person.job_id,
					section_id: person.section_id,
					tracked: person.tracked,
					personnel_code: personnelCode,
					camera_whitelist: person.camera_whitelist,
					allowed_pass: person.allowed_pass,
					alert: person.alert
				},
				{
					first_name: ['required', 'string'],
					last_name: ['required', 'string'],
					national_code: ['string'],
					email: ['email'],
					phone_number: ['string'],
					job_id: ['string'],
					section_id: ['string'],
					tracked: ['boolean'],
					personnel_code: ['required', 'string'],
					camera_whitelist: ['array'],
					allowed_pass: [],
					alert: ['boolean']
				}
			);

			if (personValidate.fails()) {
				errors.push({
					index: i,
					personnel_code: String(personnelCode ?? ''),
					errors: personValidate.errors.all()
				});
				continue;
			}

			if (typeof personnelCode !== 'string' || !/^[0-9]+$/.test(personnelCode)) {
				errors.push({
					index: i,
					personnel_code: String(personnelCode ?? ''),
					error: 'personnel_code must contain only numbers'
				});
				continue;
			}

			try {
				// Check if personnel with this code already exists
				const existingPersonnel = await Personnel.findOne({
					personnel_code: personnelCode
				}).exec();

				if (existingPersonnel) {
					Logger.warn('Duplicate personnel code, skipping', {
						personnel_code: personnelCode,
						index: i
					});
					errors.push({
						index: i,
						personnel_code: personnelCode,
						error: 'Personnel with this code already exists - skipped'
					});
					continue;
				}

				// Create new personnel record
				const newPersonnel = new Personnel({
					first_name: firstName,
					last_name: lastName,
					national_code: nationalCode || '',
					email: email || '',
					phone_number: phoneNumber || '',
					job_id: person.job_id || null,
					tracked: person.tracked || false,
					personnel_code: personnelCode,
					camera_whitelist: person.camera_whitelist || [],
					section_whitelist: person.section_id ? [person.section_id] : person.section_whitelist || [],
					schedule_whitelist: person.schedule_whitelist || [],
					department_whitelist: person.department_whitelist || [],
					allowed_pass: person.allowed_pass || undefined,
					alert: person.alert || false,
					person_type: person.person_type || 'normal'
				});

				await newPersonnel.save();

				results.push({
					personnel: {
						_id: newPersonnel._id,
						personnel_code: newPersonnel.personnel_code,
						first_name: newPersonnel.first_name,
						last_name: newPersonnel.last_name,
						national_code: newPersonnel.national_code,
						email: newPersonnel.email,
						phone_number: newPersonnel.phone_number,
						job_id: newPersonnel.job_id,
						tracked: newPersonnel.tracked,
						alert: newPersonnel.alert,
						person_type: newPersonnel.person_type
					}
				});
			} catch (error) {
				Logger.error('Error creating personnel - continuing to next', {
					personnel_code: person.personnel_code,
					index: i,
					error: error instanceof Error ? error.message : String(error)
				});

				errors.push({
					index: i,
					personnel_code: person.personnel_code,
					error: error instanceof Error ? error.message : 'Unknown error occurred'
				});
				// Continue to next personnel instead of stopping
				continue;
			}
		}

		// Return results with detailed summary
		const summary = {
			total: personnels.length,
			successful: results.length,
			failed: errors.length,
			summary_message: `Processed ${personnels.length} personnel: ${results.length} successful, ${errors.length} failed/skipped`
		};

		Logger.debug('Batch personnel import completed', summary);

		return ApiRes(res, {
			status: 201,
			data: {
				...summary,
				results,
				errors: errors.length > 0 ? errors : undefined
			}
		});
	} catch (error) {
		Logger.error('Error in batch_personnel_add', {
			error: error instanceof Error ? error.message : String(error)
		});

		return ApiRes(res, {
			status: 500,
			msg: 'Internal server error during batch personnel import'
		});
	}
};
