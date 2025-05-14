import { Router } from 'express';

import userRoutes from './user.Routes';
import accessLevels from './accessLevel.Routes';
import { accessCheck, roleCheck, userCanGetHisInfo } from '../../authentication/accessCheck.auth';

const router: Router = Router();

//add rotes
router.use('/users', accessCheck('user', { extraFunction: userCanGetHisInfo }), userRoutes);
router.use('/accessLevels', roleCheck('admin'), accessLevels);

export default router;
