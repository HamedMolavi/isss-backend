import { Router } from 'express';
import userRoutes from './custom/userRoutes';
import cameraRoutes from './custom/cameraRoutes';
import fileRoutes from './custom/fileRoutes';
import departementRoutes from './custom/departementRoutes';
import sectionRoutes from './custom/sectionRoutes';
import jobTitleRoutes from './custom/jobTitleRoutes';
import personnelRoutes from './custom/personnelRoutes';
import plateRoutes from './custom/carRoutes';
import AIRoutes from './custom/AIRoutes';
import scheduleRoutes from './custom/scheduleRoutes';
import modelRoutes from './custom/modelRoutes';
import colorRoutes from './custom/carColorRoutes';
import carRoutes from './custom/carBrandRoutes';

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