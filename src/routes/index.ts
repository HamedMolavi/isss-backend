import { Router } from 'express';
import userRoutes from './custom/userRoutes';
import cameraRoutes from './custom/cameraRoutes';
import fileRoutes from './custom/fileRoutes';
import departementRoutes from './custom/departementRoutes';
import sectionRoutes from './custom/sectionRoutes';
import jobTitleRoutes from './custom/jobTitleRoutes';
import personnelRoutes from './custom/personnelRoutes';
import plateRoutes from './custom/plateRoutes';
import AIRoutes from './custom/AIRoutes';

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
router.use('/plate', plateRoutes);
router.use('/AI', AIRoutes);

export default router;