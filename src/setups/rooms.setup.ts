import { read } from "../db/mongo/read.database";
import Camera from "../db/mongo/models/camera";
import { addRooms } from "../tools/rooms.tools";

export async function setupRooms() {
  let onlineCameras = await read(Camera);
  for (const cam of onlineCameras) {
    const cam_id = cam.id;
    await addRooms(cam_id);
  };
  // alerting rooms
  return process["CONSUMERS"];
};
