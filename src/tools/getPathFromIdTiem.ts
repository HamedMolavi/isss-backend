import path from 'path';

export function getPathFromIdTime(timestamp: number, camera_id: string): string {
	const dateVideo: string = new Date(Number(timestamp)).toLocaleDateString();
	const dateVideList: string[] = dateVideo.split('/');
	let dateVideListMaped = dateVideList.map((element) => {
		if (element.length == 1) {
			return '0' + element;
		}
		return element;
	});
	const nameFolderVideo: string = `${dateVideListMaped[2]}.${dateVideListMaped[0]}.${dateVideListMaped[1]}`;
	var options = { hour12: false };
	const timeVideo: string = new Date(Number(timestamp)).toLocaleTimeString('en-GB', options);
	const timeVideList: string[] = timeVideo.split(':');
	let timeVideListMaped = timeVideList.map((element) => {
		if (element.length == 1) {
			return '0' + element;
		}
		return element;
	});
	let nameFileVideo: string = `${timeVideListMaped[0]}.${timeVideListMaped[1]}.${timeVideListMaped[2]?.split(' ')[0]}.mp4`;
	let _path = path.join(__dirname, './../../assets/video');
	const videoPath = `${_path}/${camera_id}/${nameFolderVideo}/${nameFileVideo}`;
	return videoPath;
}
