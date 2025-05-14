import mongoose, { Schema } from 'mongoose';
import { ILogType } from '../../../types/interfaces/logType.interface';

//create LogType model with schema for save in DB
const LogTypeSchema: Schema<ILogType> = new Schema(
	{
		name: { type: String, required: true },
		filePath: { type: String },
		defaultConfig: { type: Object }
	},
	{
		collection: 'LogType',
		toJSON: {
			transform(_doc, ret) {
				delete ret['filePath'];
				return ret;
			}
		}
	}
);

// LogTypeSchema.post('save', async (doc)=>{});
// LogTypeSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc) => { });

// Compile model from schema
const LogType = mongoose.model('LogType', LogTypeSchema);
export default LogType;
