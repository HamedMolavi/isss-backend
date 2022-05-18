"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userRoutes_1 = __importDefault(require("./custom/userRoutes"));
const cameraRoutes_1 = __importDefault(require("./custom/cameraRoutes"));
const fileRoutes_1 = __importDefault(require("./custom/fileRoutes"));
const departementRoutes_1 = __importDefault(require("./custom/departementRoutes"));
const sectionRoutes_1 = __importDefault(require("./custom/sectionRoutes"));
const jobTitleRoutes_1 = __importDefault(require("./custom/jobTitleRoutes"));
//create router for add to server 
const router = (0, express_1.Router)();
//add rotes app
router.use('/user', userRoutes_1.default);
router.use('/camera', cameraRoutes_1.default);
router.use('/file', fileRoutes_1.default);
router.use('/departement', departementRoutes_1.default);
router.use('/section', sectionRoutes_1.default);
router.use('/jobtitle', jobTitleRoutes_1.default);
exports.default = router;
