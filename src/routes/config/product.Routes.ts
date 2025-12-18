import { Router } from 'express';
import { dtoValidationMiddleware } from '../../validation/dto';
import { existCheck } from '../../validation/db';
import { createMiddleware } from '../../db/mongo/create.database';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { deleteByIdMiddleware } from '../../db/mongo/delete.database';
import mongoose, { isValidObjectId, PipelineStage } from 'mongoose';
import { CreateProductBody, FilterProductBody } from '../../validation/dto/product.dto';
import Product from '../../db/mongo/models/product';
import { IProduct } from '../../types/interfaces/product.interface';
import PersonImage from '../../db/mongo/models/personImage';
import Personnel from '../../db/mongo/models/personnel';
import { productCols, sendExcelMiddleware } from '../../tools/excel.tools';
import Time from '../../tools/time.tools';
import { BaseConfig } from '../../config/base.config';
import { accessCheck } from '../../authentication/accessCheck.auth';

/**
 * Type definition for person data structure used in product operations
 */
interface PersonData {
	_id: mongoose.Types.ObjectId;
	first_name: string;
	last_name: string;
	person_type: string;
	[key: string]: unknown;
}

/**
 * Type definition for body query parameters
 */
interface BodyQueryParams {
	id: string;
	[key: string]: unknown;
}

/**
 * Type definition for filter body structure
 */
interface FilterBody {
	product_name?: string;
	personnels?: (string | null | undefined)[];
	client_type?: string;
	date_start?: string;
	date_end?: string;
	time_start?: string;
	time_end?: string;
	timez?: string;
	timezone?: string;
	[key: string]: unknown;
}

/**
 * Constructs S3 URL from file key
 * @param fileKey - The file key in the S3 bucket
 * @returns The complete URL to access the file
 */
const getFileUrl = (fileKey: string): string => {
	return `${BaseConfig.BUCKET_NAME}/${fileKey}`;
};

const router: Router = Router();

// Apply access check middleware to all product routes
router.use(accessCheck('product'));

/**
 * Constructs MongoDB aggregation pipeline for raw text search across product and personnel fields
 * @param search - The search string to match against multiple fields
 * @returns Array of MongoDB pipeline stages for aggregation
 */
const rawSearch = (search: string): PipelineStage[] => {
	const query: PipelineStage[] = [
		{ $lookup: { from: 'Personnel', localField: 'person_id', foreignField: '_id', as: 'person' } },
		{ $unwind: '$person' },
		{
			$match: {
				$or: [
					{ 'person.first_name': { $regex: search } },
					{ 'person.last_name': { $regex: search } },
					{ 'person.national_code': { $regex: search } },
					{ 'person.personnel_code': { $regex: search } },
					{ 'person.phone_number': { $regex: search } },
					{ name: { $regex: search } },
					{ product_code: { $regex: search } }
				]
			}
		},
		{ $replaceWith: `$$ROOT` }
	];
	return query;
};

/**
 * Constructs MongoDB aggregation pipeline for filtered search based on body criteria
 * Falls back to raw search if JSON parsing fails
 * @param bodyStrOrSearchString - JSON string containing filter criteria or plain search string
 * @returns Array of MongoDB pipeline stages for aggregation
 */
const filterSearch = (bodyStrOrSearchString: string): PipelineStage[] => {
	try {
		const body: FilterBody = JSON.parse(bodyStrOrSearchString);

		// Build match conditions dynamically
		const matchConditions = [];

		if (body['product_name']) {
			matchConditions.push({ name: { $regex: body['product_name'] } });
		}

		const validPersonnels = body['personnels']?.filter((el) => Boolean(el));
		if (validPersonnels?.length) {
			matchConditions.push({
				$or: validPersonnels.map((person_id) => ({
					person_id: new mongoose.Types.ObjectId(person_id as string)
				}))
			});
		}

		if (body['client_type']) {
			matchConditions.push({ 'person.person_type': body['client_type'] });
		}

		const query: PipelineStage[] = [
			{ $lookup: { from: 'Personnel', localField: 'person_id', foreignField: '_id', as: 'person' } },
			{ $unwind: '$person' },
			{
				$match: {
					$and: matchConditions.length > 0 ? matchConditions : [{}]
				}
			},
			{ $replaceWith: `$$ROOT` }
		];

		if (body.date_start && body.date_end) {
			const timezone = body.timez ?? body.timezone;
			const timeStart = (body.time_start ?? '00:00') as Parameters<typeof Time.getEpochList>[2];
			const timeEnd = (body.time_end ?? '23:59') as Parameters<typeof Time.getEpochList>[3];

			const times_epoch = Time.getEpochList(
				body.date_start,
				body.date_end,
				timeStart,
				timeEnd,
				timezone ? timezone : 'Asia/Tehran'
			);
			if (times_epoch.length) {
				const matchStage = query[2] as PipelineStage.Match;
				if (matchStage.$match && matchStage.$match.$and) {
					matchStage.$match.$and.push({
						$or: times_epoch.map((el) => ({
							create_date: { $gt: new Date(parseInt(el.gte)), $lt: new Date(parseInt(el.lte)) }
						}))
					});
				}
			}
		}
		return query;
	} catch {
		return rawSearch(bodyStrOrSearchString);
	}
};

/**
 * CREATE - Create new product
 * @route POST /
 * @body {CreateProductBody} - Product creation data
 * @returns {Object} Created product with features flattened
 */
router.post(
	'',
	dtoValidationMiddleware(CreateProductBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	existCheck(Product, { $and: [{ product_code: 'product_code' }] }, 'Product already exists!'),
	createMiddleware(
		[
			{ name: (body) => body['product_name'] ?? 'product' },
			{ images: (body) => body['product_images'] },
			'product_code',
			'person_id',
			'face_log_id',
			{ features: (body) => [{ name: 'product_weight', value: body['product_weight'] }] }
		],
		Product,
		{
			send: (doc: IProduct & Required<{ _id: mongoose.Types.ObjectId }>) => {
				const featuresObj = doc.features.reduce<Record<string, unknown>>((ret, el) => {
					ret[el.name] = el.value;
					return ret;
				}, {});

				return Object.assign(doc.toJSON(), featuresObj);
			}
		}
	)
);

/**
 * READ - Get all products with pagination and search
 * @route GET /
 * @query {string} [search] - Search string for filtering
 * @returns {Array} List of products with populated person data
 */
router.get(
	'',
	readMiddleware(Product, rawSearch, {
		populate: true,
		aggregate: true,
		forcePopulate: ['person_id'],
		send: productSendFunction
	})
);

/**
 * READ - Export products to Excel
 * @route GET /excel
 * @returns {File} Excel file containing products data
 */
router.get(
	'/excel',
	readMiddleware(Product, rawSearch, {
		populate: true,
		aggregate: true,
		forcePopulate: ['person_id'],
		next: true,
		save: 'products',
		send: productExcelSendFunction
	})
);

/**
 * Helper function to check if a value contains meaningful content
 * @param value - The value to check
 * @returns True if value is meaningful, false otherwise
 */
const hasValue = (value: unknown): boolean => {
	if (['string', 'boolean', 'number'].includes(typeof value)) {
		return Boolean(value);
	}
	if (Array.isArray(value)) {
		return value.filter((el) => Boolean(el)).length > 0;
	}
	return false;
};

/**
 * READ - Filter products by criteria
 * @route POST /filter$
 * @body {FilterProductBody} - Filter criteria
 * @returns {Array} Filtered list of products
 */
router.post(
	'/filter$',
	dtoValidationMiddleware(FilterProductBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	Time.compareTimeMiddleware('time_start', 'time_end'),
	readMiddleware(Product, filterSearch, {
		populate: true,
		forcePopulate: ['person_id'],
		aggregate: true,
		send: productSendFunction,
		searchFromBody: (body) => {
			const hasDateRange = body.date_start && body.date_end;
			const hasOtherFilters = Object.entries(body)
				.filter(([k]: [string, unknown]) => !['date_start', 'date_end', 'time_start', 'time_end'].includes(k))
				.some(([, v]: [string, unknown]) => hasValue(v));

			if (hasDateRange || hasOtherFilters) {
				return JSON.stringify(body);
			}
			return '';
		}
	})
);

/**
 * READ - Filter products and export to Excel
 * @route POST /filter/excel
 * @body {FilterProductBody} - Filter criteria
 * @returns {File} Excel file containing filtered products
 */
router.post(
	'/filter/excel',
	dtoValidationMiddleware(FilterProductBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	readMiddleware(Product, filterSearch, {
		populate: true,
		forcePopulate: ['person_id'],
		aggregate: true,
		save: 'products',
		next: true,
		send: productExcelSendFunction,
		searchFromBody: (body) => {
			const hasFilters = Object.values(body).some((v: unknown) => hasValue(v));
			return hasFilters ? JSON.stringify(body) : '';
		}
	})
);

/**
 * Middleware to send Excel file
 * @route USE *\/excel$
 */
router.use('*/excel$', sendExcelMiddleware({ cols: productCols, rows: 'products' }));

/**
 * READ - Get single product by ID
 * @route GET /:id
 * @param {string} id - Product ID
 * @returns {Object} Product details with populated person data
 */
router.get(
	'/:id',
	readByIdMiddleware(Product, { populate: true, forcePopulate: ['person_id'], send: productSendFunction })
);

/**
 * DELETE - Delete product by ID
 * @route DELETE /:id
 * @param {string} id - Product ID
 * @description Also deletes associated personnel and image vectors
 */
router.delete(
	'/:id',
	deleteByIdMiddleware(Personnel, {
		idGenerator: async (bodyQueryParams: BodyQueryParams) => {
			const product = await Product.findById(bodyQueryParams.id).exec();
			if (!product?.person_id) {
				return undefined;
			}
			const personnel = await Personnel.findById(product.person_id).exec();
			return personnel?.id;
		}
	})
);

/**
 * Formats product data with populated person information and image URLs
 * @param productDoc - The product document to format
 * @returns Formatted product object with person data and image URLs, or undefined on error
 */
async function productSendFunction(
	productDoc: IProduct & Required<{ _id: mongoose.Types.ObjectId }>
): Promise<Record<string, unknown> | undefined> {
	try {
		if (isValidObjectId(productDoc.person_id)) {
			await productDoc.populate('person_id');
		}

		const person = productDoc.person_id as unknown as PersonData;
		const images = await PersonImage.find({ person_id: person._id }).exec();

		// Map images to URLs instead of reading base64
		const imageUrls = images
			.filter((image) => image.file_key)
			.map((image) => ({
				hash_id: image.hash_id,
				file_url: getFileUrl(image.file_key!)
			}));

		const featuresObj = productDoc.features.reduce<Record<string, unknown>>((ret, el) => {
			ret[el.name] = el.value;
			return ret;
		}, {});

		return {
			...productDoc.toJSON(),
			...featuresObj,
			person_images: imageUrls,
			client_type: person.person_type
		};
	} catch (error) {
		console.error(error);
		return undefined;
	}
}

/**
 * Formats product data for Excel export
 * @param productDoc - The product document to format
 * @returns Formatted product object for Excel with first image URL
 */
async function productExcelSendFunction(
	productDoc: IProduct & Required<{ _id: mongoose.Types.ObjectId }>
): Promise<Record<string, unknown>> {
	if (isValidObjectId(productDoc.person_id)) {
		await productDoc.populate('person_id');
	}

	const person = productDoc.person_id as unknown as PersonData;
	const images = await PersonImage.find({ person_id: person._id }).exec();

	// Get first image URL instead of base64
	const firstImageUrl = images.find((image) => image.file_key)
		? getFileUrl(images.find((image) => image.file_key)!.file_key!)
		: null;

	return {
		first_name: person.first_name,
		last_name: person.last_name,
		person_image: firstImageUrl,
		name: productDoc.name,
		person_type: person.person_type,
		image: productDoc.images[0],
		create_time: productDoc.create_date,
		create_date: productDoc.create_date,
		product_weight: productDoc.features.find((el) => el.name === 'product_weight')?.value
	};
}

export default router;
