import { Router } from 'express';
import userRoutes from './custom/config/user.Routes';
import cameraRoutes from './custom/config/camera.Routes';
import fileRoutes from './custom/config/file.Routes';
import departementRoutes from './custom/config/departement.Routes';
import sectionRoutes from './custom/config/section.Routes';
import jobTitleRoutes from './custom/config/jobTitle.Routes';
import personnelRoutes from './custom/config/personnel.Routes';
import carRoutes from './custom/config/car.Routes';
import scheduleRoutes from './custom/config/schedule.Routes';
import modelRoutes from './custom/config/model.Routes';
import carColorRoutes from './custom/config/carColor.Routes';
import carBrandRoutes from './custom/config/carBrand.Routes';
import sabotageslogs from './custom/report/sabotage.Routes';
import firelogs from './custom/report/fire.Routes';
import facelogs from './custom/report/face.Routes';
import humanlogs from './custom/report/human.Routes';
import platelogs from './custom/report/plate.Routes';
import modelToCamera from './custom/config/modelToCamera.Routes';

//create router for add to server 
const router: Router = Router();

//add rotes app
router.use('/users', userRoutes);
router.use('/cameras', cameraRoutes);
router.use('/files', fileRoutes);
router.use('/departements', departementRoutes);
router.use('/sections', sectionRoutes);
router.use('/jobtitles', jobTitleRoutes);
router.use('/personnels', personnelRoutes);
router.use('/cars', carRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/models', modelRoutes);
router.use('/carcolors', carColorRoutes);
router.use('/carbrands', carBrandRoutes);
router.use('/sabotages', sabotageslogs);
router.use('/fires', firelogs);
router.use('/faces', facelogs);
router.use('/humans', humanlogs);
router.use('/plates', platelogs);
router.use('/modelToCameras', modelToCamera);

export default router;