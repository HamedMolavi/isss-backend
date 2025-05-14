import { Router, Request, Response, NextFunction } from 'express';
import { getResourcesMiddleware } from '../../middleware/resources.middleware';

//create router for add to routes file
const router: Router = Router();

router.get('', getResourcesMiddleware());

// router.get("ram", (req, res, next) => { res.json({}) })
export default router;
