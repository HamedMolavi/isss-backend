body = {
	rule_index: 'r_0',
	type: 'face',
	cause: 'unknown-face',
	section: 'aaaaaa',
	description: 'Person is not recognized',
	creation_timestamp: 1665228061676,
	log: {
		plate_number: '', // optional => if exists then _car is defined
		confidence: 0,
		schedule_id: '633bed23d7f9fb57486ea812', // optional => if exists
		timestamp: 16652410800,
		personnel_id: '628dfa6ff014bc89f0280c84', // optional => if exists then _personnel is defined
		camera_id: '628dc14af014bc89f0280c46' // must exist: 404
	}
};

// let _camera = "defined" // Camera populate with section_id
// let _departement = "optional if camera.section_id.department_id" // Department
// let _car = "optional if body.log.plate_number" // Car populate with owner
// let _personnel = "optional if body.log.personnel_id" // Personnel
// let schedule = "optinal if body.log.schedule_id" // Schedule populate with model_camera_id
// let is_muted_list = "false by default, else _camera?.muted.includes(schedule?.model_camera_id?.model_id)" // send to client or not

// ================================================================================
let result = {
	title: _personnel != null ? 'Alerting' : 'Warnings',
	tracked: _personnel?.tracked != null ? _personnel?.tracked : _car?.tracked != null ? _car?.tracked : null,
	type: bodyRequest.type,
	confidence: bodyRequest.log.confidence,
	camera: _camera?.name,
	camera_id: _camera?._id.toString(),
	section: _camera?.section_id?.name,
	departement: _departement?.name,
	personnel: _personnel?.first_name + ' ' + _personnel?.last_name,
	personnel_code: _personnel?.personnel_code,
	description: bodyRequest.description,
	time: bodyRequest.log.timestamp,
	peopleCounting: bodyRequest.log.number_of_people,
	plate_number: bodyRequest.log.plate_number,
	owner: _car?.owner?.first_name + ' ' + _car?.owner?.last_name,
	cause: bodyRequest.cause
};
// send result if (is_muted === false) or (_personnel?.tracked === true) or (_car?.tracked === true)

// ================================================================================
const recorder = new Recorder(rtsp_link, pathSave, {
	// rtsp-video-recorder module
	title: 'Record video stream'
});
isOpenForRecord = 'true if Camera_Is_Record[i].includes(result.camera_id)';
if (notification.title == 'Alerting' && Camera_Is_Record.length < 2 && !isOpenForRecord) {
	('open recorder');
	('setTimeout for removing camera from Cam_Is_Record');
}
// ================================================================================
('send sms and email for each notif in db??');
// ================================================================================
('send status 201 and success true to dispatcher as result');
