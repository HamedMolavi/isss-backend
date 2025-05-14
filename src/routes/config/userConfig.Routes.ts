import { Router } from 'express';
import cameraRoutes from './camera.Routes';
import fileRoutes from './file.Routes';
import departementRoutes from './departement.Routes';
import sectionRoutes from './section.Routes';
import jobTitleRoutes from './jobTitle.Routes';
import personnelRoutes from './personnel.Routes';
import productRoutes from './product.Routes';
import carRoutes from './car.Routes';
import scheduleRoutes from './schedule.Routes';
import carColorRoutes from './carColor.Routes';
import carBrandRoutes from './carBrand.Routes';
import modelToCamera from './modelToCamera.Routes';
import reportDepartementfiles from './departmentFile.Routes';
import PersonImage from './personImage.Routes';
import notification from './notification.Routes';
import testSMS from './testSMS.Routes';
import testEmail from './testEmailSend.Routes';
import snapshot from './snapshot.Routes';
import manualLog from './manualLog.Routes';
import logType from './logType.Routes';
import userAccessLevel from './userAccessLevel.Routes';

const router: Router = Router();
import modelRoutes from './model.Routes';
import { accessCheck, paramIdExistsInCameraWhiteList } from '../../authentication/accessCheck.auth';

//add rotes
router.use('/accessLevels', userAccessLevel);
router.use('/cameras', accessCheck('camera'), paramIdExistsInCameraWhiteList(), cameraRoutes);
router.use('/cars', accessCheck('car'), carRoutes);
router.use(
	'/carcolors',
	accessCheck('color', { extraFunction: (req) => req.method.toUpperCase() === 'GET' }),
	carColorRoutes
);
router.use(
	'/carbrands',
	accessCheck('brand', { extraFunction: (req) => req.method.toUpperCase() === 'GET' }),
	carBrandRoutes
);
router.use('/departments', accessCheck('department'), departementRoutes);
router.use('/sections', accessCheck('section'), sectionRoutes);
router.use('/jobtitles', accessCheck('job'), jobTitleRoutes);
router.use('/personnels', accessCheck('personnel'), personnelRoutes);
router.use('/transactions', accessCheck('product'), productRoutes);
router.use('/schedules', accessCheck('schedule'), scheduleRoutes);
router.use('/files', fileRoutes);
router.use('/models', modelRoutes);
router.use('/modelToCameras', modelToCamera);
router.use('/departementfiles', reportDepartementfiles);
router.use('/personImage', accessCheck('personnel'), PersonImage);
router.use('/notifications', notification);
router.use('/testsms', testSMS);
router.use('/testemail', testEmail);
router.use('/snapshot', snapshot);
router.use('/manuallog', manualLog);
router.use('/logtype', logType);

export default router;
