import mongoose from 'mongoose';
import Camera from '../db/mongo/models/camera';
import Model from '../db/mongo/models/model';
import ModelToCamera from '../db/mongo/models/modelToCamera';
import { ICamera } from '../types/interfaces/camera.interface';
import { create } from '../db/mongo/create.database';
type localTypeCamera = mongoose.Document<unknown, any, ICamera> &
	Omit<
		ICamera &
			Required<{
				_id: mongoose.Types.ObjectId;
			}>,
		never
	>;

export async function initBalancer() {
	/*
tree = {
  "category1":{
    "model_name1": how many camera,
    "model_name2": how many camera
  },
  "category2":{
    "model_name1": how many camera,
    "model_name2": how many camera
  },
}
*/
	let tree: Object & { [key: string]: Object & { [key: string]: number } } = {};

	let models = await Model.find({}).exec();
	let cameras = await Camera.find({}).exec();
	let model_cameras = await ModelToCamera.find({}).exec();

	// fill the tree and count model_camera documents (load)
	for (const model of models) {
		if (!tree.hasOwnProperty(model.category)) tree[model.category] = {};
		tree[model.category][model.name] = cameras.reduce(
			(pre, camera) =>
				!!model_cameras.some(
					(el) =>
						el.model_id.toString() === model._id.toString() &&
						el.camera_id.toString() === camera._id.toString()
				)
					? pre + 1
					: pre,
			0
		);
	}
	process.load = { ...tree };
}

export async function balanceNewCamera(camera: localTypeCamera) {
	for (const category in process.load) {
		if (
			!Object.keys(process.load[category]).some((name) => {
				if (process.load[category][name] < parseInt(process.env.MAX_LOAD)) {
					process.load[category][name] += 1;
					addNewModelToCamera(name, camera._id);
					return true;
				}
				return false;
			})
		) {
			let name = await newModelForBalancing(category);
			addNewModelToCamera(name, camera._id);
			process.load[category][name] = 1;
		}
	}
}

export async function newModelForBalancing(category: string) {
	let newIndex = Object.entries(process.load[category]).length;
	let newName = category + newIndex.toString();
	await create(Model, {
		name: newName,
		category: category,
		uri: `models/${category}.onnx`
	});
	return newName;
}

export async function addNewModelToCamera(modelName: string, cameraId: mongoose.Types.ObjectId) {
	await create(ModelToCamera, {
		model_id: (await Model.findOne({ name: modelName }).exec())?._id,
		camera_id: cameraId,
		is_enabled: true
	});
}
