import userRoutes from './custom/userRoutes';
import cameraRoutes from './custom/cameraRoutes';
import fileRoutes from './custom/fileRoutes';
import departementRoutes from './custom/departementRoutes';
import { Router } from 'express';

//create router for add to server 
const router: Router = Router();

//add rotes app
router.use('/user', userRoutes);
router.use('/camera', cameraRoutes);
router.use('/file', fileRoutes);
router.use('/departement', departementRoutes);


export default router;