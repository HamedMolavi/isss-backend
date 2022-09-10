import { NextFunction, Router, Request, Response } from "express";
import { ApiError } from "../../error/error.handler";
import Camera from "../../models/camera";
import Personnel from "../../models/personnel";
import { io } from "../../server";
import Path from "path";
import Section from "../../models/section";
import Department from "../../models/department";
import Car from "../../models/car";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to server
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

router.get("/", function (req: Request, res: Response, next: NextFunction) {
  let path = Path.join(__dirname, "./../../../index.html");
  console.log(path);
  res.sendFile(path);
});

//get alerts from back
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get jason from body request
    const bodyRequest = req.body;
    console.log(req.body)
    let _camera = await Camera.findById(bodyRequest.log.camera_id).exec();
    let _section;
    if (_camera) {
      _section = await Section.findById(_camera.section_id).exec();
    }
    let _departement;
    if (_section) {
      _departement = await Department.findById(_section.department_id).exec();
    }
    let _owner;
    if (bodyRequest.log.plate_number) {
      _owner = await Car.findOne({ number_plate: bodyRequest.log.plate_number }).exec();
    }
    let _personnel;
    if ((bodyRequest.log.personnel_id) && (bodyRequest.log.personnel_id !== -1)) {
      _personnel = await Personnel.findById(bodyRequest.log.personnel_id).exec();
    }
    // if(_owner_id )
    // {
    //    _owner_id = await Personnel.findById(_owner_id?._id).exec();
    // }

    let result = {
      type: bodyRequest.type,
      confidence: bodyRequest.log.confidence,
      camera: _camera?.name,
      section: _section?.name,
      departement: _departement?.name,
      personnel: _personnel?.first_name + " " + _personnel?.last_name,
      description: bodyRequest.description,
      time: new Date(bodyRequest.log.timestamp),
      peopleCounting: bodyRequest.log.number_of_people,
      plate_number: bodyRequest.log.plate_number,
      owner: "_owner_id?._id",
    };
    // console.log(result);
    let notification = result;
    // if (bodyRequest.type === "face") {
    //   notification = `${result.personnel?.first_name} ${result.personnel?.last_name} with personnel code: ${result.personnel?.personnel_code} ditected in camera: ${result.camera}, section:${result.section}, department:${result.departement}`;
    // } else if (bodyRequest.type === "fire") {
    //   notification_text = `fire ditected in camera: ${result.camera}, section: ${result.section}, department: ${result.departement}`;
    // } else if (bodyRequest.type === "human") {
    //   notification_text = `#${result.peopleCounting} human(s) ditected in camera: ${result.camera}, section: ${result.section}, department: ${result.departement}`;
    // } else if (bodyRequest.type === "sabotage") {
    //   notification_text = `sabotage ditected in camera: ${result.camera}, section: ${result.section}, department: ${result.departement}`;
    // } else if (bodyRequest.type === "plate") {
    //   notification_text = `car plate: ${result.plate_number} with owner: ${result.owner} ditected in camera: ${result.camera}, section: ${result.section}, department:${result.departement}, owner: `;
    // }
    console.log(result);
    // console.log(notification_text);
    io.emit("get alert", notification);

    return res.status(201).json({
      success: true,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error , " + err.message));
  }
});

export default router;
