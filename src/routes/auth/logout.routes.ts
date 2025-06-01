import { Router } from 'express';
import { logout } from '../../controllers/logout.controller';

const router = Router();

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout the current user
 * @access Private
 */
router.post('/', logout);

export default router;
