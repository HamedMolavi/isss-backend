//TODO: is this enough?
export async function updateRooms(doc: any) {
  const cam_id: string = doc.id;
  if ([...process["CONSUMERS"].keys()].some((val) => val.endsWith(doc.id))) removeRooms(cam_id);
  else addRooms(cam_id);
};

export async function addRooms(cam_id: string) {
  process["CONSUMERS"].set(`stream_${cam_id}`, undefined); // rooms for streaming video, e.g. stream_628dc28ef014bc89f0280c4a
  process["MODELS"].forEach((model) => process["CONSUMERS"].set(`${model}_${cam_id}`, undefined)) // rooms in which alerts are sent, e.g. fire_628dc28ef014bc89f0280c4a
};

export async function removeRooms(cam_id: string) {
  process["CONSUMERS"].delete(`stream_${cam_id}`);
  process["MODELS"].forEach((model) => process["CONSUMERS"].delete(`${model}_${cam_id}`)) // rooms in which alerts are sent, e.g. fire_628dc28ef014bc89f0280c4a
};