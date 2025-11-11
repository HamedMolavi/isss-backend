import path from 'path';
import fs from 'fs';
import { Kafka, logLevel as KafkaLogLevel } from 'kafkajs';
import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../types/classes/error.class';
import { hashString } from './hash';
import { read } from '../db/mongo/read.database';
import Personnel from '../db/mongo/models/personnel';
import { IPersonnel } from '../types/interfaces/personnel.interface';
import { getPropertyFromBody } from './utils.tools';
import { generateRandomString } from './util.tools';
import mongoose from 'mongoose';
import { Logger } from '../logger';

// Kafka broker addresses from environment configuration
const KAFKA_BROKERS = process.env['KAFKA_BOOTSTRAP'].split(',');
const KAFKA_LOG_LEVEL = KafkaLogLevel.ERROR;
const KAFKA_AI_TIMEOUT = parseInt(process.env['KAFKA_AI_TIMEOUT'] || '30000', 10);

/**
 * Consumer data transformation functions
 * These functions format incoming Kafka messages into standardized objects
 * indexed by their unique identifiers for quick lookup
 */
const consumerDataPrepareFunction = {
	/** Transform sara service response - raw message pass-through */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	sara: (msg: Record<string, any>) => ({
		[msg['_id']]: msg
	}),

	/** Transform asghar service response - face detection and embedding data */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	asghar: (msg: Record<string, any>) => ({
		[msg['personnel_id']]: {
			timestamp: new Date().toISOString(),
			_id: msg['_id'],
			personnel_id: msg['personnel_id'],
			personnel_name: msg['personnel_name'] as string | undefined,
			face: msg['cropped_face'] as string | undefined,
			cropped_face: msg['cropped_face'] as string | undefined,
			masked_face: msg['masked_face'] as string | undefined,
			masked_embd: msg['masked_embd'] as number[] | undefined,
			embedding: msg['cropped_embd'] as number[] | undefined,
			cropped_embs: msg['cropped_embs'] as number[] | undefined, // Fix: use plural form
			has_face: msg['has_face'] as boolean,
			multi_face: msg['multi_face'] as boolean | undefined
		}
	}),

	/** Transform kobra service response - face matching results */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	kobra: (msg: Record<string, any>) => ({
		[msg['id']]: {
			timestamp: new Date().toISOString(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			data: msg['matches']?.map((elem: Record<string, any>) => {
				return elem.id;
			})
		}
	}),

	/** Transform ghabil service response - operation status and result */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	ghabil: (msg: Record<string, any>) => ({
		[msg['person_id']]: {
			timestamp: new Date().toISOString(),
			_id: msg['_id'] as string | null,
			status_code: msg['status_code'] as number | null,
			success: msg['success'] as boolean | null,
			message: msg['message'] as string | null
		}
	})
};
/**
 * Producer data transformation functions
 * These functions prepare and format data before sending to Kafka topics
 * for processing by AI/microservices
 */
const producerDataPrepareFunction = {
	/** Prepare data for dara service - image path processing */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	dara: async (inputs: Record<string, any>) => {
		return {
			_id: inputs['_id'],
			path: inputs['path']
		};
	},

	/** Prepare data for soghra service - personnel image with metadata */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	soghra: async (inputs: Record<string, any>) => {
		const fullFrame: string = inputs.image_str ?? '';
		const personnel = await Personnel.findById(inputs.personnel_id).exec();
		const timestamp = new Date(new Date().toLocaleString() + '+0').toISOString();
		const personnelName = personnel ? `${personnel.first_name} ${personnel.last_name}` : '';
		// Extract base64 data from data URL if present (format: data:image/jpeg;base64,...)
		const frameData = fullFrame?.split(',')[1] ?? fullFrame;

		// Use input personnel_id as fallback if personnel not found
		const personnelId = personnel?.id ?? inputs.personnel_id ?? '';

		return {
			_id: new mongoose.Types.ObjectId().toHexString(),
			personnel_id: personnelId,
			personnel_name: personnelName,
			full_frame: frameData ?? '',
			face: '',
			embedding: '',
			has_face: '0',
			confidence: inputs.confidence ?? '0',
			timestamp: timestamp
		};
	},

	/** Prepare data for akbar service - anonymous image processing */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	akbar: (inputs: Record<string, any>) => {
		const fullFrame: string = inputs.image_str ?? '';
		const timestamp = new Date(new Date().toLocaleString() + '+0').toISOString();
		// Extract base64 data from data URL if present
		const frameData = fullFrame?.split(',')[1] ?? fullFrame;

		return {
			personnel_id: '',
			personnel_name: '',
			full_frame: frameData ?? '',
			face: '',
			embedding: '',
			has_face: '0',
			confidence: inputs.confidence ?? '0',
			timestamp: timestamp,
			id: inputs.id
		};
	},

	/** Prepare data for habil service - add face vector to existing personnel */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	habil: (inputs: Record<string, any>) => {
		const timestamp = new Date(new Date().toLocaleString() + '+0').toISOString();

		return {
			_id: inputs._id ?? '',
			personnel_id: inputs.person_id ?? '',
			hash_id: inputs.hash_id ?? '',
			vector: inputs.vector ?? [],
			confidence: inputs.confidence ?? '0.99',
			timestamp: timestamp
		};
	}
};

/**
 * SnapshotKafka Class
 * Manages asynchronous communication with Kafka for image processing workflows.
 * Implements request-response pattern over Kafka topics with timeout handling
 * and concurrent request prevention.
 */
export class SnapshotKafka {
	/** Track personnel IDs with ongoing processing to prevent duplicate requests */
	ongoings: string[];

	constructor() {
		this.ongoings = [];
	}

	/**
	 * Execute a Kafka producer-consumer session
	 * Sends data to a Kafka topic and waits for a response on the same topic
	 *
	 * @param allInOneInput - Configuration for the Kafka session
	 * @param allInOneInput.consumerKey - Key to identify expected response messages
	 * @param allInOneInput.producerKey - Key to identify outgoing message type
	 * @param allInOneInput.producerInput - Data to send to Kafka
	 * @param allInOneInput.consumerId - Unique ID to match request/response
	 * @param allInOneInput.timeout - Max wait time in ms (default: from KAFKA_AI_TIMEOUT env or 30000)
	 * @returns Promise resolving to the response data or error object
	 */
	async kafkaSession(allInOneInput: {
		consumerKey: string;
		producerKey: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		producerInput: Record<string, any>;
		consumerId: string;
		timeout?: number;
	}) {
		const { consumerKey, producerKey, producerInput, consumerId } = allInOneInput;

		// Prevent duplicate processing for the same personnel
		const hasOngoingProcess = this.ongoings.some(
			(id) => id === producerInput?.personnel_id || id === producerInput?.person_id
		);
		if (hasOngoingProcess) {
			throw Error(`This person has ongoing image process!`);
		}

		// Get the appropriate data preparation function
		const handler = producerDataPrepareFunction[producerKey as keyof typeof producerDataPrepareFunction];
		if (!handler) {
			return undefined;
		}

		// Prepare and serialize the message
		const sentData = await handler(producerInput);
		const messageBuffer = Buffer.from(JSON.stringify(sentData), 'utf8');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let result: Record<string, any> = { error: 'No data found for the given ID' };
		// Track if we got a response (reassigned in Promise callback)

		// Initialize Kafka consumer FIRST with unique group ID to ensure message delivery
		const kafka = new Kafka({ clientId: 'backend', brokers: KAFKA_BROKERS });
		const consumer = kafka.consumer({ groupId: generateRandomString(10) });
		await consumer.connect();
		await consumer.subscribe({ topic: 'snapshot', fromBeginning: false });

		// Track this personnel as having an ongoing process
		if (producerInput?.personnel_id) {
			this.ongoings.push(producerInput.personnel_id);
		}

		// Log the start of Kafka session
		const timeoutDuration = allInOneInput.timeout ?? KAFKA_AI_TIMEOUT;

		// Initialize Kafka producer (after consumer is ready)
		const producer = new Kafka({ logLevel: KAFKA_LOG_LEVEL, brokers: KAFKA_BROKERS }).producer();
		await producer.connect();

		// Create promise-based request-response pattern
		return new Promise((resolve) => {
			/** Cleanup and resolve handler */
			const cleanupAndResolve = () => {
				clearTimeout(timeoutTimer);
				// Remove personnel from ongoing list
				this.ongoings = this.ongoings.filter((id) => id && id !== consumerId);
				consumer.stop();

				return resolve(result);
			};

			// Set timeout for response (configurable via KAFKA_AI_TIMEOUT env variable)
			const timeoutTimer = setTimeout(cleanupAndResolve, timeoutDuration);

			// Start consuming messages BEFORE sending producer message
			consumer
				.run({
					eachMessage: async ({ message }) => {
						try {
							const parsedMessage = JSON.parse(message.value?.toString('utf8') as string);
							const messageKey = message.key?.toString();

							// Filter messages by expected consumer key
							if (messageKey !== consumerKey) {
								console.log('Message key mismatch, skipping', {
									received: messageKey,
									expected: consumerKey
								});
								return;
							}

							// Transform response using appropriate consumer function
							const transformHandler =
								consumerDataPrepareFunction[consumerKey as keyof typeof consumerDataPrepareFunction];
							const transformedBody = transformHandler(parsedMessage);
							result = Object.values(transformedBody)[0];
							const responseId = Object.keys(transformedBody)[0];

							if (responseId !== consumerId) {
								console.log('Response ID mismatch, skipping', {
									received: responseId,
									expected: consumerId
								});
								return;
							}

							return cleanupAndResolve();
						} catch (error) {
							// On any error, log and cleanup
							console.error('Error processing Kafka message', {
								error: error instanceof Error ? error.message : String(error),
								consumerId
							});
							return cleanupAndResolve();
						}
					}
				})
				.then(() => {
					return producer.send({ topic: 'snapshot', messages: [{ key: producerKey, value: messageBuffer }] });
				})
				.then(() => {
					Logger.debug('Message sent successfully to Kafka', {
						topic: 'snapshot',
						key: producerKey,
						consumerId
					});
					producer.disconnect();
				})
				.catch((error) => {
					console.error('Failed to send message to Kafka', {
						topic: 'snapshot',
						key: producerKey,
						consumerId,
						error: error instanceof Error ? error.message : String(error)
					});
					producer.disconnect();
					cleanupAndResolve();
				});
		});
	}

	/**
	 * Wrap a function as Express middleware with error handling and result processing
	 *
	 * @param f - Function to wrap (typically kafkaSession or similar async operation)
	 * @param inputs - Function to extract arguments from request
	 * @param options - Configuration for result handling
	 * @returns Express middleware function
	 */
	middlewareWraper(
		// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
		f: Function,
		inputs: (req: Request) => unknown[] | Promise<unknown[]>,
		options: {
			/** Property name in request body to send as response */
			resultPropertyName?: string | undefined;
			/** Function to validate result and return error if invalid */
			resultValidationFunction?: (
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				result: Record<string, any>
			) =>
				| undefined
				| { status: number; message: string }
				| Promise<undefined | { status: number; message: string }>;
			/** Property name in request body to save result */
			save?: string | undefined;
			/** If true, call next() instead of sending response */
			next?: boolean;
		}
	) {
		return async (req: Request, res: Response, next: NextFunction) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			let result: any;

			try {
				// Execute the wrapped function with extracted inputs
				result = await f.call(this, ...(await inputs(req)));
			} catch (e) {
				return next(new ApiError(500, String(e)));
			} // Save result to request body if specified
			if (options.save) {
				req.body[options.save] = result;
			}

			// Validate result if validation function provided
			if (options?.resultValidationFunction?.call) {
				const errorMessage = await options.resultValidationFunction.call(this, result);
				if (errorMessage) {
					return next(new ApiError(errorMessage.status, errorMessage.message));
				}
			}

			// Send specific property from request body
			if (options.resultPropertyName) {
				return res.status(201).json({
					success: true,
					data: req.body[options.resultPropertyName as string]
				});
			}

			// Pass to next middleware if specified
			if (options.next) {
				return next();
			}

			// Send result directly
			return res.status(201).json({
				success: true,
				data: result
			});
		};
	}
}

/**
 * @deprecated ImageFileSystem Class - DEPRECATED - DO NOT USE
 *
 * This class has been deprecated and replaced by S3-based file storage.
 * All functionality has been migrated to:
 * - src/file_upload/methods/file/file_create_from_base64.ts (uploadBase64ToS3Middleware)
 * - src/file_upload/methods/file/file_destroy_by_person.ts (deletePersonImagesMiddleware)
 * - src/file_upload/aws/upload.ts (file_upload)
 * - src/file_upload/aws/download.ts (download_file, download_file_as_base64)
 *
 * Keep for reference only. Will be removed in future version.
 *
 * Old functionality: Managed local file storage operations for personnel images
 * New approach: All images stored in S3/MinIO with URLs constructed dynamically
 */
export class ImageFileSystem {
	baseDir = path.join(__dirname, './../..');
	imageDir = './assets/image';
	hash: (json: string) => string;
	secret = process.env['SESSION_SECRET'];

	constructor() {
		// Initialize directory structure
		this.updateRootDirectories();
		// Pre-create directories for all existing personnel
		this.preCreateDirectories();
		// Initialize hash function with session secret
		this.hash = (imgBase64: string) => hashString(imgBase64, this.secret);
	}

	/**
	 * Upload an avatar image for a personnel
	 *
	 * @param id - Personnel ID (used for directory organization)
	 * @param imageStr - Base64 encoded image string (with or without data URL prefix)
	 * @param options - Optional configuration
	 * @returns Object containing image metadata and paths
	 */
	uploadAvatar = (id: string, imageStr: string, options?: { fileName?: string }) => {
		let imagePath: string = '';
		let name = '';
		let hash = '';

		// Extract base64 data from data URL if present (format: data:image/jpeg;base64,...)
		imageStr = imageStr.split(',').length >= 2 ? imageStr.split(',')[1] : imageStr;

		// Use custom filename or generate hash-based name
		if (options?.fileName) {
			name = options.fileName;
		} else {
			hash = this.hash(imageStr);
			name = `${id}-${hash}`;
		}

		// Convert base64 string to buffer
		const imageBuffer = Buffer.from(imageStr as string, 'base64');

		// Get or create directory for this personnel
		const imageDirectory = this.makeAndReturnNewDirectoryForUser(id as string);
		imagePath = path.join(imageDirectory, `${name}.jpeg`);

		// Write image file to disk
		fs.writeFileSync(imagePath, imageBuffer as Uint8Array);

		return {
			imageStr,
			name,
			imagePath,
			hash
		};
	};

	/**
	 * Express middleware to handle avatar upload from request
	 *
	 * @param imagePropertyName - Dot-notation path to image data in request body
	 * @param idPropertyName - Dot-notation path to personnel ID in request body
	 * @param options - Configuration for middleware behavior
	 * @returns Express middleware function
	 */
	uploadAvatarMiddleware = (
		imagePropertyName: string,
		idPropertyName: string,
		options?: { next?: boolean; fileName?: string; resultPropertyName?: string }
	) => {
		return async (req: Request, res: Response, next: NextFunction) => {
			try {
				let imagePath: string = '';
				let name = '';

				// Extract personnel ID from request body
				const personnelId = String(getPropertyFromBody(req, idPropertyName.split('.')) ?? '');
				// Extract image data from request body
				let imageStr = String(getPropertyFromBody(req, imagePropertyName.split('.')) ?? '');
				const hasRequiredData = Boolean(imageStr && personnelId);

				if (hasRequiredData) {
					// Extract base64 data from data URL if present
					imageStr = imageStr.split(',').length >= 2 ? imageStr.split(',')[1] : imageStr;

					// Use custom filename or generate hash-based name
					if (options?.fileName) {
						name = options.fileName;
					} else {
						const imageHash = this.hash(imageStr);
						name = `${personnelId}-${imageHash}`;
						// Store hash ID in request body for later use
						req.body['hash_id'] = imageHash;
					}

					// Convert base64 to buffer
					const imageBuffer = Buffer.from(imageStr as string, 'base64');

					// Get or create directory for this personnel
					const imageDirectory = this.makeAndReturnNewDirectoryForUser(personnelId as string);
					imagePath = path.join(imageDirectory, `${name}.jpeg`);

					// Write image file to disk
					fs.writeFileSync(imagePath, imageBuffer as Uint8Array);
				}

				// Pass to next middleware if specified
				if (options?.next) {
					return next();
				}

				// Send custom response property if specified
				if (!options?.resultPropertyName) {
					return res.status(hasRequiredData ? 201 : 404).json({
						success: hasRequiredData,
						data: hasRequiredData
							? {
									name: `${name}.jpeg`,
									location: imagePath,
									message: 'Uploaded the file successfully!'
								}
							: { message: 'Uploaded the file failed!' }
					});
				} else {
					return res.status(201).json({
						success: true,
						data: req.body[options.resultPropertyName]
					});
				}
			} catch {
				return next(new ApiError(500, 'Internal Error!'));
			}
		};
	};

	/**
	 * Express middleware to download avatar file
	 *
	 * @param imagePropertyName - Request parameter name containing the file identifier
	 * @returns Express middleware function
	 */
	downloadAvatarMiddleware(imagePropertyName: string) {
		return (req: Request, res: Response, next: NextFunction) => {
			try {
				// Get file name from request params
				const fileName = req.params[imagePropertyName];

				// Construct directory path
				const imagePath = path.join(this.baseDir, fileName, 'avatar.jpeg');

				// Send image file to client
				return res.download(imagePath, fileName, (err) => {
					if (err) {
						req.flash('error', 'File not found');
						return next(new ApiError(404, 'File not found'));
					}
				});
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				return next(new ApiError(500, 'internal server error' + errorMessage));
			}
		};
	}

	/**
	 * Express middleware to list all stored images with their metadata
	 *
	 * @returns Express middleware function
	 */
	listMiddleware() {
		return async (_req: Request, res: Response, next: NextFunction) => {
			try {
				const fileInfos: object[] = [];

				// Get base directory path
				const directoryPath = path.join(this.baseDir, this.imageDir);

				// Get all personnel image directories
				const imageFolders = fs.readdirSync(directoryPath);

				// Loop through each personnel directory
				for (const imageFolder of imageFolders) {
					// Get all image files in personnel directory
					const imageFiles = fs.readdirSync(path.join(directoryPath, imageFolder));

					// Collect file info for each image
					for (const image of imageFiles) {
						const fileInfo = fs.statSync(path.join(directoryPath, imageFolder, image));
						fileInfos.push({
							name: image,
							size: fileInfo.size,
							path: path.join(directoryPath, imageFolder, image)
						});
					}
				}

				// Send list of all images to client
				res.status(200).send(fileInfos);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : String(err);
				return next(new ApiError(500, 'internal server error' + errorMessage));
			}
		};
	}

	/**
	 * Read multiple image files and convert to base64
	 *
	 * @param dirname - Directory containing the image files
	 * @param files - Array of filenames to read
	 * @returns Array of objects with hash_id and base64 encoded image data
	 */
	readFiles(
		dirname: string,
		files: Array<string>
	): { hash_id: string; faces_base64: string; [key: string]: unknown }[] | null {
		// Filter out non-existent files
		files = files.filter((file) => fs.existsSync(path.join(dirname, file)));
		const response: { hash_id: string; faces_base64: string }[] = [];

		// Read each file and convert to base64
		for (const file of files) {
			// Extract hash ID from filename (format: personnelId-hashId.jpeg)
			const hashId = file.split('-')[1].split('.')[0];
			const fileContent = fs.readFileSync(path.join(dirname, file), 'base64');

			const result = {
				hash_id: hashId,
				faces_base64: fileContent
			};
			response.push(result);
		}

		return response;
	}

	/**
	 * Delete multiple image files from a directory
	 *
	 * @param dirname - Directory containing the files to delete
	 * @param files - Array of filenames to delete
	 * @returns true if successful, false if error occurred
	 */
	deleteFiles(dirname: string, files: Array<string>): boolean | null {
		try {
			// Filter to only existing files
			files = files.filter((file) => fs.existsSync(path.join(dirname, file)));

			// Delete each file
			for (const file of files) {
				fs.unlinkSync(path.join(dirname, file));
			}

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Express middleware to delete entire personnel directory
	 *
	 * @param idPropertyName - Path to personnel ID in request body (string or array for nested property)
	 * @param options - Configuration options
	 * @returns Express middleware function
	 */
	deleteDirectoryMiddleware(
		idPropertyName: string | Array<string>,
		options?: { force?: boolean; next?: boolean; save?: string; send?: string }
	) {
		return (req: Request, res: Response, next: NextFunction) => {
			// Extract personnel ID from request body
			interface PersonnelIdRecord {
				[key: string]: string | PersonnelIdRecord;
			}
			let personnelId: string | Array<PersonnelIdRecord>;
			if (typeof idPropertyName === 'string') {
				personnelId = req.body[idPropertyName as string] as string;
			} else {
				personnelId = req.body[
					(idPropertyName as Array<string>).shift() as string
				] as Array<PersonnelIdRecord>;
				for (const name of idPropertyName) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					personnelId = (personnelId as any)[name];
				}
			}

			personnelId = String(personnelId);
			const dirname = path.join(this.baseDir, personnelId);

			let result: boolean | null;

			// Check if directory exists
			if (!fs.existsSync(dirname)) {
				result = null; // Directory doesn't exist
			} else {
				const filenames = fs.readdirSync(dirname);

				// Prevent deletion if directory contains files (unless force is true)
				if (filenames.length > 0 && !options?.force) {
					result = false; // Directory not empty and force not enabled
				} else {
					// Delete directory and all contents
					fs.rmSync(dirname, { recursive: true, force: true });
					result = true;
				}
			}

			// Pass to next middleware if specified
			if (options?.next) {
				if (options?.save) {
					req.body[options.save] = result;
				} else {
					req.body['doc'] = result;
				}
				return next();
			}

			// Send response to client
			return res.status(201).json({
				success: true,
				data: options?.send ? req.body[options.send] : result
			});
		};
	}

	/**
	 * Initialize and create root directory structure
	 * Recursively creates all directories in the imageDir path
	 * @private
	 */
	private updateRootDirectories() {
		// Incrementally build path and create directories
		for (const step of this.imageDir.split('/')) {
			this.baseDir = path.join(this.baseDir, step);

			// Create directory if it doesn't exist
			if (!fs.existsSync(this.baseDir)) {
				fs.mkdirSync(this.baseDir);
			}
		}
	}

	/**
	 * Pre-create directories for all existing personnel in database
	 * Called during initialization to ensure directory structure is ready
	 * @private
	 */
	private async preCreateDirectories() {
		const personnel: IPersonnel[] = await read(Personnel);

		for (const person of personnel) {
			try {
				fs.mkdirSync(path.join(this.baseDir, this.imageDir, person.id));
			} catch {
				// Directory may already exist, ignore error
			}
		}
	}

	/**
	 * Get or create directory for a specific personnel
	 *
	 * @param id - Personnel ID
	 * @returns Absolute path to the personnel's directory
	 * @private
	 */
	private makeAndReturnNewDirectoryForUser(id: string) {
		const directoryPath = path.join(this.baseDir, id);

		// Create directory if it doesn't exist
		if (!fs.existsSync(directoryPath)) {
			fs.mkdirSync(directoryPath);
			return directoryPath;
		}

		return directoryPath;
	}
}
