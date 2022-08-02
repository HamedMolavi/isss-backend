"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_Routes_1 = __importDefault(require("./custom/config/user.Routes"));
const camera_Routes_1 = __importDefault(require("./custom/config/camera.Routes"));
const file_Routes_1 = __importDefault(require("./custom/config/file.Routes"));
const departement_Routes_1 = __importDefault(require("./custom/config/departement.Routes"));
const section_Routes_1 = __importDefault(require("./custom/config/section.Routes"));
const jobTitle_Routes_1 = __importDefault(require("./custom/config/jobTitle.Routes"));
const personnel_Routes_1 = __importDefault(require("./custom/config/personnel.Routes"));
const car_Routes_1 = __importDefault(require("./custom/config/car.Routes"));
const schedule_Routes_1 = __importDefault(require("./custom/config/schedule.Routes"));
const model_Routes_1 = __importDefault(require("./custom/config/model.Routes"));
const carColor_Routes_1 = __importDefault(require("./custom/config/carColor.Routes"));
const carBrand_Routes_1 = __importDefault(require("./custom/config/carBrand.Routes"));
const modelToCamera_Routes_1 = __importDefault(require("./custom/config/modelToCamera.Routes"));
const report_Routes_1 = __importDefault(require("./custom/report/report.Routes"));
const departmentReport_Routes_1 = __importDefault(require("./custom/report/departmentReport.Routes"));
const error_handler_1 = require("../error/error.handler");
const departmentFile_Routes_1 = __importDefault(require("./custom/config/departmentFile.Routes"));
//create router for add to server
const router = (0, express_1.Router)();
//add rotes app
router.use("/users", user_Routes_1.default);
router.use("/cameras", camera_Routes_1.default);
router.use("/files", file_Routes_1.default);
router.use("/departments", departement_Routes_1.default);
router.use("/sections", section_Routes_1.default);
router.use("/jobtitles", jobTitle_Routes_1.default);
router.use("/personnels", personnel_Routes_1.default);
router.use("/cars", car_Routes_1.default);
router.use("/schedules", schedule_Routes_1.default);
router.use("/models", model_Routes_1.default);
router.use("/carcolors", carColor_Routes_1.default);
router.use("/carbrands", carBrand_Routes_1.default);
router.use("/modelToCameras", modelToCamera_Routes_1.default);
router.use("/reports", report_Routes_1.default);
router.use("/reportDepartmets", departmentReport_Routes_1.default);
router.use("/departementfiles", departmentFile_Routes_1.default);
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
//add not found route handler
router.use("*", (req, res, next) => {
    const err = new error_handler_1.ApiError(404, `Requested path ${req.path} not found`);
    next(err);
    //next(new ApiError(404, `Requested path ${req.path} not found`));
});
const enviroment = process.env.NODE_ENV || "development";
//add error handler middleware
router.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500; // <- Look here
    return res.status(statusCode).send({
        success: false,
        message: err.message,
        stack: enviroment === "development" ? err.stack : "",
    });
});
exports.default = router;
