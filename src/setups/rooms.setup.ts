import { read } from "../db/mongo/read.database";
import Camera from "../models/camera";

export async function setupRooms() {
  // camera stream rooms
  let onlineCameras = await read(Camera);
  for (const cam of onlineCameras) {
    const cam_id = cam.id;
    process["CONSUMERS"].set(`cam_${cam_id}`, undefined);
  };
  // get alert room
  process["CONSUMERS"].set("get_alert", undefined);
  return process["CONSUMERS"];
};
