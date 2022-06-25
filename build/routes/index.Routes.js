"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_Routes_1 = __importDefault(require("./custom/user.Routes"));
const camera_Routes_1 = __importDefault(require("./custom/camera.Routes"));
const file_Routes_1 = __importDefault(require("./custom/file.Routes"));
const departement_Routes_1 = __importDefault(require("./custom/departement.Routes"));
const section_Routes_1 = __importDefault(require("./custom/section.Routes"));
const jobTitle_Routes_1 = __importDefault(require("./custom/jobTitle.Routes"));
const personnel_Routes_1 = __importDefault(require("./custom/personnel.Routes"));
const car_Routes_1 = __importDefault(require("./custom/car.Routes"));
const AI_Routes_1 = __importDefault(require("./custom/AI.Routes"));
const schedule_Routes_1 = __importDefault(require("./custom/schedule.Routes"));
const model_Routes_1 = __importDefault(require("./custom/model.Routes"));
const carColor_Routes_1 = __importDefault(require("./custom/carColor.Routes"));
const carBrand_Routes_1 = __importDefault(require("./custom/carBrand.Routes"));
const modelReport_Routes_1 = __importDefault(require("./custom/modelReport.Routes"));
//create router for add to server 
const router = (0, express_1.Router)();
//add rotes app
router.use('/users', user_Routes_1.default);
router.use('/cameras', camera_Routes_1.default);
router.use('/files', file_Routes_1.default);
router.use('/departements', departement_Routes_1.default);
router.use('/sections', section_Routes_1.default);
router.use('/jobtitles', jobTitle_Routes_1.default);
router.use('/personnels', personnel_Routes_1.default);
router.use('/cars', car_Routes_1.default);
router.use('/AIs', AI_Routes_1.default);
router.use('/schedules', schedule_Routes_1.default);
router.use('/models', model_Routes_1.default);
router.use('/carcolors', carColor_Routes_1.default);
router.use('/carbrands', carBrand_Routes_1.default);
router.use('/reportmodels', modelReport_Routes_1.default);
exports.default = router;
