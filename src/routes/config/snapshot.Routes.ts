import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/classes/error.class';
import Camera from '../../db/mongo/models/camera';
import takeSnapshot, { cameraInfo } from '../../tools/takeSnaphsot';
import { ICamera } from '../../types/interfaces/camera.interface';
import { DataImportExportLogger } from '../../logger/data-input-output.logger';
import { accessCheck } from '../../authentication/accessCheck.auth';

//create router for add to server file
const router: Router = Router();

//route for get snapshot from camera with ip and username and password
router.get(
	'/:id',
	accessCheck('dataImportExport'),
	async function (req: Request, res: Response, next: NextFunction) {
		try {
			const id: string = req.params.id; //get query parameter id from url
			//return null if id not found
			if (!id) {
				req.flash('error', 'Please enter id');
				return next(new ApiError(400, 'Please enter id'));
			}
			//query for get camera from DB
			const camera: ICamera | null = await Camera.findById(id).exec();
			//return response not found to client if not found camera
			if (!camera) {
				req.flash('error', 'camera not found');
				DataImportExportLogger.snapshotCaptured(req, id, 'unknown', false, 'camera not found');
				return next(new ApiError(404, 'camera not found'));
			}
			const _camInfo: cameraInfo = {
				ip: camera.ip,
				username: camera.username,
				password: camera.password
			};
			const snapshotBase64: string | null | undefined = await takeSnapshot(_camInfo);
			if (!snapshotBase64) {
				req.flash('error', 'There was a problem on creating the image, please try again');
				DataImportExportLogger.snapshotCaptured(req, id, camera.ip, false, 'Failed to capture snapshot');
				return next(new ApiError(404, 'There was a problem on creating the image, please try again'));
			}

			// Log successful snapshot capture
			DataImportExportLogger.snapshotCaptured(req, id, camera.ip, true);

			//return response to client with departements file list
			return res.status(200).json({
				success: true,
				data: snapshotBase64
			});
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			DataImportExportLogger.snapshotCaptured(
				req,
				req.params.id || 'unknown',
				'unknown',
				false,
				errorMessage
			);
			return next(new ApiError(500, 'internal server error' + errorMessage));
		}
	}
);

export default router;
