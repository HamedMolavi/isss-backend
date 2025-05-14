import axios from 'axios';

const onvif = require('node-onvif');

export type cameraInfo = {
	ip: string;
	username: string;
	password: string;
	nvr?: string;
};
//take snapshot from camera with ip , username , password
async function takeSnapshot(camInfo: cameraInfo) {
	try {
		if (!camInfo.ip || !camInfo.username || !camInfo.password) {
			return null; // input verify
		}
		//create new device for camera on type onvif
		var device = new onvif.OnvifDevice({
			xaddr: 'http://' + camInfo.ip + ':80/onvif/device_service',
			user: camInfo.username,
			pass: camInfo.password
		});
		await device.init(); //initial device
		console.log('fetching the data of the snapshot...');
		let res = await device.fetchSnapshot(); //fetch image from camera
		//convert result from binary to base64
		let mimeType = res.headers['content-type'];
		let rawImage = res.headers['accept-ranges'];
		let prefix = 'data:' + mimeType + ';base64,';
		let base64Image = Buffer.from(res.body, rawImage).toString('base64');
		let image = prefix + base64Image;
		return image;
	} catch (error) {
		console.log(error);
	}
}

export default takeSnapshot;
