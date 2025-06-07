import { Router } from 'express';
import { getStreamUri, testCameraMiddleware } from '../../tools/camera.tools';
import { dtoValidationMiddleware } from '../../validation/dto';
import { CameraInfoBody, CreateCameraBody, UpdateCameraBody } from '../../validation/dto/camera.dto';
import { CameraInfoKeys } from '../../types/interfaces/camera.interface';
import { injectDataMiddleware } from '../../tools/request.tools';
import * as CameraController from '../../controllers/camera.controller';

//create router for add to server
const CameraRouter: Router = Router();

const route_prefix = '';

//add route for register new camera
CameraRouter.post(
	`${route_prefix}`,
	dtoValidationMiddleware(CreateCameraBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	getStreamUri(CameraInfoKeys),
	CameraController.create
);

//route for get id camera with ip from back RTSPtoWEBRTC
CameraRouter.post(
	`${route_prefix}/getIdStream`,
	dtoValidationMiddleware(CameraInfoBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	testCameraMiddleware,
	CameraController.getCameraInfo
);

//route for get cameras list
CameraRouter.get(`${route_prefix}`, CameraController.getAll);

//listing routes
CameraRouter.get(`${route_prefix}/:id/white/personnel`, CameraController.getWhitelistPersonnel);

CameraRouter.get(`${route_prefix}/:id/white/cars`, CameraController.getWhitelistCars);

CameraRouter.get(`${route_prefix}/:id/white`, CameraController.getWhitelist);

CameraRouter.get(`${route_prefix}/:id/schedules`, CameraController.getSchedules);

//route for get camera by id from DB
CameraRouter.get(`${route_prefix}/:id`, CameraController.getById);

//add route for edit camera
CameraRouter.patch(
	`${route_prefix}/:id`,
	dtoValidationMiddleware(UpdateCameraBody, {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development' ? true : false,
		info: 'please fill all fields'
	}),
	injectDataMiddleware((body: { [key: string]: unknown }) => body?.damaged ?? false, { injData: 'damaged' }),
	CameraController.updateById
);

//add route for delete camera
CameraRouter.delete(`${route_prefix}/:id`, CameraController.deleteById);

export default CameraRouter;
