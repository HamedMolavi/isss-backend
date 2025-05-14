import { Document, Schema } from 'mongoose';

//define Model type
export interface IModel extends Document {
	_id: Schema.Types.ObjectId;
	name: string;
	category: string;
	uri: string;
}
