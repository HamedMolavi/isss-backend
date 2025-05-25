import { Application } from 'express';
import { BaseConfig } from '../config/base.config';

// Auth routes
import LoginRouter from './auth/login.Routes';

// Config routes
import UserConfigRouter from './config/userConfig.Routes';
import AdminConfigRouter from './config/adminConfig.Routes';
import FileRouter from './config/file.Routes';
import SnapshotRouter from './config/snapshot.Routes';
import TestEmailRouter from './config/testEmailSend.Routes';
import TestSMSRouter from './config/testSMS.Routes';
import UserRouter from './config/user.Routes';
import UserAccessLevelRouter from './config/userAccessLevel.Routes';
import CarColorRouter from './config/carColor.Routes';
import DepartementRouter from './config/departement.Routes';
import DepartmentFileRouter from './config/departmentFile.Routes';
import JobTitleRouter from './config/jobTitle.Routes';
import ManualLogRouter from './config/manualLog.Routes';
import ModelRouter from './config/model.Routes';
import ModelToCameraRouter from './config/modelToCamera.Routes';
import NotificationRouter from './config/notification.Routes';
import PersonImageRouter from './config/personImage.Routes';
import PersonnelRouter from './config/personnel.Routes';
import ProductRouter from './config/product.Routes';
import ScheduleRouter from './config/schedule.Routes';
import SectionRouter from './config/section.Routes';
import AccessLevelRouter from './config/accessLevel.Routes';
import CameraRouter from './config/camera.Routes';
import CarRouter from './config/car.Routes';
import CarBrandRouter from './config/carBrand.Routes';

// Report routes
import ReportRouter from './report/report.Routes';
import NewReportRouter from './report/new.report';
import VideoDownloadRouter from './report/videoDownload.Routes';
import SimilarityRouter from './report/similarity.Routes';
import SchedulesReportRouter from './report/schedulesReport.Routes';
import DepartmentReportRouter from './report/departmentReport.Routes';
import TrackReportRouter from './report/trackReport.Routes';

// Log routes
import LogRouter from './log/log.Routes';
import LogTypeRouter from './log/logType.Routes';

// Session routes
import SessionRouter from './config/session.Routes';

// System routes
import SystemRouter from './system/index.Routes';

// Middleware imports
import { passportGate } from '../authentication/authorize.auth';
import { accessCheck, hasAccess } from '../authentication/accessCheck.auth';

export function RegisterRoutes(app: Application) {
	const routePrefix = BaseConfig.API_PREFIX;

	// Health check route
	app.get(`${routePrefix}/healthcheck`, (req, res) => {
		res.status(200).send('OK');
	});

	// Routes that don't need authentication
	app.use(`${routePrefix}/auth/login`, LoginRouter);

	// Apply authentication middleware for all routes below
	app.use(routePrefix, passportGate);

	// Config routes - User
	app.use(`${routePrefix}/config/user`, UserConfigRouter);
	app.use(`${routePrefix}/config/admin`, AdminConfigRouter);

	// Config routes - General
	app.use(`${routePrefix}/config/files`, FileRouter);
	app.use(`${routePrefix}/config/snapshot`, SnapshotRouter);
	app.use(`${routePrefix}/config/test-email`, TestEmailRouter);
	app.use(`${routePrefix}/config/test-sms`, TestSMSRouter);
	app.use(`${routePrefix}/config/users`, UserRouter);
	app.use(`${routePrefix}/config/user-access-levels`, UserAccessLevelRouter);
	app.use(`${routePrefix}/config/car-colors`, CarColorRouter);
	app.use(`${routePrefix}/config/departements`, DepartementRouter);
	app.use(`${routePrefix}/config/department-files`, DepartmentFileRouter);
	app.use(`${routePrefix}/config/job-titles`, JobTitleRouter);
	app.use(`${routePrefix}/config/manual-logs`, ManualLogRouter);
	app.use(`${routePrefix}/config/models`, ModelRouter);
	app.use(`${routePrefix}/config/model-to-cameras`, ModelToCameraRouter);
	app.use(`${routePrefix}/config/notifications`, NotificationRouter);
	app.use(`${routePrefix}/config/person-images`, PersonImageRouter);
	app.use(`${routePrefix}/config/personnel`, PersonnelRouter);
	app.use(`${routePrefix}/config/products`, ProductRouter);
	app.use(`${routePrefix}/config/schedules`, ScheduleRouter);
	app.use(`${routePrefix}/config/sections`, SectionRouter);
	app.use(`${routePrefix}/config/access-levels`, AccessLevelRouter);
	app.use(`${routePrefix}/config/cameras`, CameraRouter);
	app.use(`${routePrefix}/config/cars`, CarRouter);
	app.use(`${routePrefix}/config/car-brands`, CarBrandRouter);

	// Report routes
	app.use(`${routePrefix}/reports`, ReportRouter);
	app.use(
		`${routePrefix}/newreports`,
		accessCheck('report', {
			extraFunction: (req, userAccess) =>
				req.method === 'POST' && !!userAccess && !!hasAccess(userAccess, 'GET')
		}),
		NewReportRouter
	);
	app.use(`${routePrefix}/download-video`, VideoDownloadRouter);
	app.use(`${routePrefix}/reports/similar`, SimilarityRouter);
	app.use(`${routePrefix}/schedules-report`, SchedulesReportRouter);
	app.use(`${routePrefix}/report-departments`, DepartmentReportRouter);
	app.use(`${routePrefix}/track-reports`, TrackReportRouter);

	// Log routes
	app.use(`${routePrefix}/logs`, LogRouter);
	app.use(`${routePrefix}/log-types`, LogTypeRouter);

	// Session routes
	app.use(`${routePrefix}/sessions`, SessionRouter);

	// System routes
	app.use(`${routePrefix}/system`, accessCheck('system'), SystemRouter);
}
