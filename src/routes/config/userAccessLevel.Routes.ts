import { Router, Request } from 'express';
import { readByIdMiddleware } from '../../db/mongo/read.database';
import AccessLevel from '../../db/mongo/models/accessLevel';

const router: Router = Router();

// User access level get
router.get(
	'',
	readByIdMiddleware(AccessLevel, { idFromReq: (req: Request) => req?.user?.access_level?.toString() })
);

export default router;
