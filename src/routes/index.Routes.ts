import { Router } from 'express';
import userRoutes from './custom/user.Routes';
import cameraRoutes from './custom/camera.Routes';
import fileRoutes from './custom/file.Routes';
import departementRoutes from './custom/departement.Routes';
import sectionRoutes from './custom/section.Routes';
import jobTitleRoutes from './custom/jobTitle.Routes';
import personnelRoutes from './custom/personnel.Routes';
import plateRoutes from './custom/car.Routes';
import AIRoutes from './custom/AI.Routes';
import scheduleRoutes from './custom/schedule.Routes';
import modelRoutes from './custom/model.Routes';
import colorRoutes from './custom/carColor.Routes';
import carRoutes from './custom/carBrand.Routes';

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
router.use('/cars', plateRoutes);
router.use('/AIs', AIRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/models', modelRoutes);
router.use('/carcolors', colorRoutes);
router.use('/carbrands', carRoutes);

export default router;