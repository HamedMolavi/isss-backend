import { Router } from 'express';
import userRoutes from './custom/user.Routes';
import cameraRoutes from './custom/camera.Routes';
import fileRoutes from './custom/file.Routes';
import departementRoutes from './custom/departement.Routes';
import sectionRoutes from './custom/section.Routes';
import jobTitleRoutes from './custom/jobTitle.Routes';
import personnelRoutes from './custom/personnel.Routes';
import carRoutes from './custom/car.Routes';
import AIRoutes from './custom/AI.Routes';
import scheduleRoutes from './custom/schedule.Routes';
import modelRoutes from './custom/model.Routes';
import carColorRoutes from './custom/carColor.Routes';
import carBrandRoutes from './custom/carBrand.Routes';
import test from './custom/test.routes';

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
router.use('/AIs', AIRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/models', modelRoutes);
router.use('/carcolors', carColorRoutes);
router.use('/carbrands', carBrandRoutes);
router.use('/test', test);

export default router;