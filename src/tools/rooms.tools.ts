import { randomUuid } from "./index.tools";

//TODO: is this enough?
export async function updateRooms(doc: any) {
  if (process["CONSUMERS"].has(`cam_${doc.id}`)) process["CONSUMERS"].delete(`cam_${doc.id}`);
  else process["CONSUMERS"].set(`cam_${doc.id}`, undefined);
};

// export async function updateRooms() {
//   // camera stream rooms
//   let onlineCameras = await read(Camera);
//   let cam_ids = onlineCameras.map((el) => el.id);
//   // set new rooms
//   cam_ids.forEach((cam_id: string) => {
//     if (!(process["ROOMS"].has(`cam_${cam_id}`))) process["ROOMS"].set(`cam_${cam_id}`, randomUuid(12))
//   })
//   // delete old rooms
//   process["ROOMS"].forEach((_val: string, key: string, map: Map<string, string>) => {
//     if (!cam_ids.includes(`cam_${key}`)) map.delete(key);
//   });
// };