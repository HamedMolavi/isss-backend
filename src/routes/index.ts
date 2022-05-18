import { Router } from 'express';
import userRoutes from './custom/userRoutes';
import cameraRoutes from './custom/cameraRoutes';
import fileRoutes from './custom/fileRoutes';
import departementRoutes from './custom/departementRoutes';
import sectionRoutes from './custom/sectionRoutes';
import jobTitleRoutes from './custom/jobTitleRoutes';

//create router for add to server 
const router: Router = Router();

//add rotes app
router.use('/user', userRoutes);
router.use('/camera', cameraRoutes);
router.use('/file', fileRoutes);
router.use('/departement', departementRoutes);
router.use('/section', sectionRoutes);
router.use('/jobtitle', jobTitleRoutes);


export default router;