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
router.use('/user', userRoutes);
router.use('/camera', cameraRoutes);
router.use('/file', fileRoutes);
router.use('/departement', departementRoutes);
router.use('/section', sectionRoutes);
router.use('/jobtitle', jobTitleRoutes);
router.use('/personnel', personnelRoutes);
router.use('/car', plateRoutes);
router.use('/AI', AIRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/model', modelRoutes);
router.use('/carcolor', colorRoutes);
router.use('/carbrand', carRoutes);

export default router;