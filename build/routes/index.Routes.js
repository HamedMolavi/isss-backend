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
//create router for add to server 
const router = (0, express_1.Router)();
//add rotes app
router.use('/user', user_Routes_1.default);
router.use('/camera', camera_Routes_1.default);
router.use('/file', file_Routes_1.default);
router.use('/departement', departement_Routes_1.default);
router.use('/section', section_Routes_1.default);
router.use('/jobtitle', jobTitle_Routes_1.default);
router.use('/personnel', personnel_Routes_1.default);
router.use('/car', car_Routes_1.default);
router.use('/AI', AI_Routes_1.default);
router.use('/schedule', schedule_Routes_1.default);
router.use('/model', model_Routes_1.default);
router.use('/carcolor', carColor_Routes_1.default);
router.use('/carbrand', carBrand_Routes_1.default);
exports.default = router;
