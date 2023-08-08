import { Schema } from "mongoose";
import { read } from "../db/mongo/read.database";
import Camera from "../db/mongo/models/camera";
import Model, { IModel } from "../db/mongo/models/model";

export async function setupRooms() {
  let models: (IModel & { _id: Schema.Types.ObjectId; })[] = await read(Model);
  let onlineCameras = await read(Camera);
  for (const cam of onlineCameras) {
    const cam_id = cam.id;
    process["CONSUMERS"].set(`stream_${cam_id}`, undefined); // rooms for streaming video, e.g. stream_628dc28ef014bc89f0280c4a
    models.forEach((model) => process["CONSUMERS"].set(`${model.category}_${cam_id}`, undefined)) // rooms in which alerts are sent, e.g. fire_628dc28ef014bc89f0280c4a
  };
  // alerting rooms
  return process["CONSUMERS"];
};
