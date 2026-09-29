import { Router, Request, Response } from 'express';
import PersonImage from '../../db/mongo/models/personImage';
import Personnel from '../../db/mongo/models/personnel';
import { readMiddleware } from '../../db/mongo/read.database';
import { remove_file } from '../../file_upload/aws/remove';
import { ApiRes } from '../../utils/api.response';
import { HttpStatus } from '../../types/http_status';
import { SnapshotKafka } from '../../tools/kafkaFile.tools';
import { processFaceRecognition, savePersonImageWithVector } from '../../controllers/file.controller';
import { getFileUrl } from '../../tools/s3.tools';
import { imageCreationRateLimit } from '../../middleware/resource-rate-limit.middleware';
import { createImageUploadMiddleware } from '../../middleware/image-upload.middleware';

/**
 * ===================================
 * PERSON IMAGE ROUTES
 * ===================================
 *
 * This router handles operations related to person images:
 * - GET /?:type - Get all personnel images by type (guest/hostile/normal)
 * - GET /:id - Get all images for a specific person
 * - POST / - Upload a new image for a person
 * - DELETE /:hash_id - Delete a specific image by hash ID
 */

// Initialize Kafka for face recognition
const snapshotKafka = new SnapshotKafka();

// Create router for personnel image endpoints
const router: Router = Router();
router.get(
	'/?:type(guest|hostile|normal)?$',
	readMiddleware(Personnel, (person_type) => ({ person_type }), {
		populate: true,
		save: 'personnel',
		forceAll: true,
		searchFromParams: (params) => params?.type?.toLowerCase() ?? 'normal',
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		send: async (person, _req) => {
			// Find all images associated with this person
			const images = await PersonImage.find({ person_id: person._id }).exec();

			if (images.length) {
				// Map images to include file URLs constructed from file_key
				const imagesWithUrls = images.map((image) => ({
					hash_id: image.hash_id,
					file_url: image.file_key ? getFileUrl(image.file_key) : null,
					_id: image._id
				}));

				return {
					_id: person.id,
					person_id: await person.toJSON(),
					images: imagesWithUrls
				};
			} else {
				return undefined;
			}
		}
	})
);

/**
 * GET /:id
 * Get all images for a specific person by person ID
 *
 * @param id - Person ID to retrieve images for
 * @returns Array of image objects with URLs
 */
router.get('/:id', async function (req: Request, res: Response) {
	try {
		const personId: string = req.params.id;

		// Validate person ID parameter
		if (!personId) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Please enter id'
			});
		}

		// Query for all images belonging to this person
		const personImages = await PersonImage.find({ person_id: personId }).exec();

		// Check if person has any images
		if (!personImages || personImages.length === 0) {
			return res.status(200).json({
				success: true,
				data: []
			});
		}

		// Map images to include file URLs constructed from file_key
		const imagesWithUrls = personImages.map((image) => ({
			hash_id: image.hash_id,
			file_url: image.file_key ? getFileUrl(image.file_key) : null,
			file_key: image.file_key,
			_id: image._id
		}));

		// Return images with URLs
		return res.status(200).json({
			success: true,
			data: imagesWithUrls
		});
	} catch (err) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error , ' + (err instanceof Error ? err.message : 'Unknown error')
		});
	}
});

/**
 * DELETE /:hash_id
 * Delete a specific person image by hash ID
 * Removes both the file from S3 and the database record
 *
 * @param hash_id - Hash ID of the image to delete
 * @returns Deleted PersonImage document
 */
router.delete('/:hash_id', async function (req: Request, res: Response) {
	try {
		// Get hash_id from URL parameters
		const hashId = req.params.hash_id;

		// Validate hash_id parameter
		if (!hashId) {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Please enter hashid'
			});
		}

		// Find the PersonImage record by hash_id
		const personImage = await PersonImage.findOne({ hash_id: hashId }).exec();

		if (!personImage) {
			return ApiRes(res, {
				status: HttpStatus.NOT_FOUND,
				msg: 'personimage Not Found'
			});
		}

		// Delete file from S3 if file_key exists
		if (personImage.file_key) {
			await remove_file(personImage.file_key);
		}

		// Delete PersonImage record from MongoDB
		const deletedPersonImage = await PersonImage.findOneAndDelete({
			hash_id: hashId
		}).exec();

		// Return success response with deleted record
		return res.status(200).json({
			success: true,
			data: deletedPersonImage
		});
	} catch (err) {
		return ApiRes(res, {
			status: HttpStatus.INTERNAL_SERVER_ERROR,
			msg: 'Internal server error , ' + (err instanceof Error ? err.message : 'Unknown error')
		});
	}
});

/**
 * POST /
 * Upload a new image for a person
 * Uploads to S3 and creates database records
 *
 * @body person_id - Person ID to associate the image with
 * @body image - Multipart file upload (as base64 or file buffer)
 * @returns Created PersonImage document with file URL
 */
// Create multer upload middleware for memory storage (no S3 upload yet)
const uploadMiddleware = createImageUploadMiddleware();

router.post(
	'/:person_id',
	imageCreationRateLimit,
	uploadMiddleware,
	async function (req: Request, res: Response) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const uploadedFile = req.file as any;
			const personId = req.params.person_id;

			// Validate required fields
			if (!personId) {
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: 'person_id is required'
				});
			}

			if (!uploadedFile) {
				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: 'image file is required'
				});
			}

			// Verify person exists
			const person = await Personnel.findById(personId).exec();
			if (!person) {
				return ApiRes(res, {
					status: HttpStatus.NOT_FOUND,
					msg: 'Personnel not found'
				});
			}

			// Convert buffer to base64 for face recognition
			const imageBase64 = uploadedFile.buffer.toString('base64');
			const imageDataUrl = `data:${uploadedFile.mimetype};base64,${imageBase64}`;

			try {
				// Process face recognition via Kafka
				const faceResult = await processFaceRecognition(
					imageDataUrl,
					personId,
					snapshotKafka.kafkaSession.bind(snapshotKafka)
				);

				if (faceResult.has_face && faceResult.embedding && faceResult.cropped_face) {
					// Save PersonImage with cropped face from Kafka (not original image)
					const personImage = await savePersonImageWithVector(
						personId,
						faceResult.cropped_face, // Use cropped_face from asghar Kafka response
						faceResult.embedding,
						faceResult._id
					);

					// Return success response with face data
					return res.status(201).json({
						success: true,
						data: {
							_id: personImage._id,
							person_id: personImage.person_id,
							hash_id: personImage.hash_id,
							file_url: personImage.file_key ? getFileUrl(personImage.file_key) : null,
							file_key: personImage.file_key,
							has_face: true,
							multi_face: faceResult.multi_face
						}
					});
				} else {
					// No face detected in image - still save PersonImage with S3 upload
					const personImage = await savePersonImageWithVector(personId, imageDataUrl, [], faceResult._id);

					// Return success response without face data
					return res.status(201).json({
						success: true,
						data: {
							_id: personImage._id,
							person_id: personImage.person_id,
							hash_id: personImage.hash_id,
							file_url: personImage.file_key ? getFileUrl(personImage.file_key) : null,
							file_key: personImage.file_key,
							has_face: false,
							multi_face: faceResult.multi_face
						}
					});
				}
			} catch (faceError) {
				// Still save the image even though face recognition failed
				const personImage = await savePersonImageWithVector(
					personId,
					imageDataUrl,
					[],
					'' // No image ID from AI service
				);

				// Return success response (image saved but face recognition failed)
				return res.status(201).json({
					success: true,
					data: {
						_id: personImage._id,
						person_id: personImage.person_id,
						hash_id: personImage.hash_id,
						file_url: personImage.file_key ? getFileUrl(personImage.file_key) : null,
						file_key: personImage.file_key,
						has_face: false,
						face_recognition_error: faceError instanceof Error ? faceError.message : 'Unknown error'
					}
				});
			}
		} catch (err) {
			return ApiRes(res, {
				status: HttpStatus.INTERNAL_SERVER_ERROR,
				msg: 'Internal server error , ' + (err instanceof Error ? err.message : 'Unknown error')
			});
		}
	}
);

export default router;
