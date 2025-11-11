import mongoose, { Schema, Document } from 'mongoose';

// Interface for File document
export interface IFileDocument extends Document {
	url: string;
	bucket_name: string;
	user_id?: string;
	file_key: string;
	size: string;
	mim_type: string;
	createdAt?: Date;
	updatedAt?: Date;
}

// Create File schema
const FileSchema: Schema<IFileDocument> = new Schema(
	{
		url: {
			type: String,
			unique: true,
			required: true
		},
		bucket_name: {
			type: String,
			required: true
		},
		user_id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: false,
			default: null
		},
		file_key: {
			type: String,
			unique: true,
			required: true
		},
		size: {
			type: String,
			required: true
		},
		mim_type: {
			type: String,
			required: true
		}
	},
	{
		collection: 'files',
		timestamps: true
	}
);

// Compile model from schema
const FileModel = mongoose.model<IFileDocument>('File', FileSchema);

export default FileModel;
