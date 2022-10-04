import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../error/error.handler";
import Personnel from "../../models/personnel";
import toPersianPlate, { toEnglishPLate } from "../../tools/EnglishToPersianPlate";
import Car from "./../../models/car";
import { getTokenAndVerify } from "./../../tools/authentication";
import CarBrand from "../../models/carBrand";
import CarColor from "../../models/carColor";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

//create router for add to routes file
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//add route for register new car
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get jason from body request
    const { owner, number_plate, brand_id, color_id, camera_whitelist } = req.body;
    if (!owner || !number_plate || !brand_id || !color_id || !camera_whitelist) {
      req.flash("error", "Car is required");
      return next(new ApiError(400, "Car is required"));
    }
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    //add plate number to json response for sort persian format in font end
    let plateNumber = {
      first: number_plate.first.toLocaleString("en-us"),
      second: number_plate.second,
      third: number_plate.third.toLocaleString("en-us"),
      fourth: number_plate.fourth.toLocaleString("en-us"),
      fifth: number_plate.fifth.toLocaleString("en-us"),
    };

    let plate_number_engglish = `${plateNumber.first}${toEnglishPLate[plateNumber.second]}${plateNumber.third}${plateNumber.fifth}`;

    //query for save new car in DB
    let car = await Car.findOne({
      $or: [{ number_plate: plate_number_engglish }, { owner: owner }],
    }).exec();

    //retrun error if car already exists
    if (car) {
      req.flash("error", "Car already exists");
      return next(new ApiError(400, "Car already exists"));
    }

    //fill new car
    let newCar = new Car({
      owner: owner,
      number_plate: plate_number_engglish,
      brand_id: brand_id,
      color_id: color_id,
      camera_whitelist: camera_whitelist,
    });
    //query for save new car in DB
    await newCar.save();
    req.flash("info", "Car added");

    let _brand: any = await CarBrand.findById(newCar.brand_id).exec();
    let _color: any = await CarColor.findById(newCar.color_id).exec();
    //send response to client
    return res.status(201).json({
      success: true,
      data: {
        owner: newCar.owner,
        number_plate: {
          first: Number(newCar.number_plate.substr(0, 2)).toLocaleString("fa-IR"),
          second: toPersianPlate[newCar.number_plate.substr(2, 1)],
          third: Number(newCar.number_plate.substr(3, 3)).toLocaleString("fa-IR"),
          fourth: "ایران",
          fifth: Number(newCar.number_plate.substr(6, 2)).toLocaleString("fa-IR"),
        },
        brand: _brand.name ?? "",
        color: _color.name ?? "",
        camera_whitelist: camera_whitelist,
      },
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//route for get car list
router.get("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    let search = (req.query.search as string) || "";
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get car list from DB
    let cars: any[] = [];
    if ((search && search.length > 0)) {
      cars = await Car.find({
        number_plate: { $regex: search, $options: "i" },
      })
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    } else {
      cars = await Car.find({})
        .limit(perPage)
        .skip(perPage * (page - 1))
        .exec();
    }

    //return response not found to client if not found cars
    if (!cars) {
      req.flash("error", "car not found");
      return next(new ApiError(404, "car not found"));
    }
    let newCars: any[] = [];
    for (let i = 0; i < cars.length; ++i) {
      let personnel = await Personnel.findById(cars[i].owner).exec();
      let _brand;
      let _color;
      if (cars[i].brand_id) {
        _brand = await CarBrand.findById(cars[i].brand_id).exec();
      }
      if (cars[i].color_id) {
        _color = await CarColor.findById(cars[i].color_id).exec();
      }

      let _owner = personnel != null ? `${personnel?.first_name} ${personnel?.last_name}` : "";
      let result = {
        _id: cars[i]._id,
        owner: _owner,
        number_plate: {
          first:cars[i].number_plate != null ? Number(cars[i].number_plate.substr(0, 2)).toLocaleString("fa-IR"):"",
          second:cars[i].number_plate != null ? toPersianPlate[cars[i].number_plate.substr(2, 1)]:"",
          third:cars[i].number_plate != null ? Number(cars[i].number_plate.substr(3, 3)).toLocaleString("fa-IR"):"",
          fourth: "ایران",
          fifth:cars[i].number_plate != null ? Number(cars[i].number_plate.substr(6, 2)).toLocaleString("fa-IR"):"",
        },
        brand: _brand != null ? _brand.name : "",
        color: _color != null ? _color.name : "",
        camera_whitelist: cars[i].camera_whitelist,
        time: cars[i].create_date,
        __v: cars[i].__v,
      };
      newCars.push(result);
    }
    //return response to client with cars list
    return res.status(200).json({
      success: true,
      data: newCars,
      page: page,
      perPage: perPage,
      total: await Car.countDocuments().exec(),
      pages: Math.ceil((await Car.countDocuments().exec()) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//route for get car by id from DB
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id;
    if (!id) {
      req.flash("error", "Car id is required");
      return next(new ApiError(400, "Car id is required"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get car by id from DB
    let car: any = await Car.findById(id).exec();

    //return response not found to client if not found car
    if (!car) {
      req.flash("error", "Car not found");
      return next(new ApiError(404, "Car not found"));
    }

    // let personnel = await Personnel.findById(car.owner).exec();
    // let _owner = personnel != null ? `${personnel?.first_name} ${personnel?.last_name}` : "";
    // let _brand = await CarBrand.findById(car.brand_id).exec();
    // let _color = await CarColor.findById(car.color_id).exec();
    //return response to client with departemen
    return res.status(200).json({
      success: true,
      data: {
        _id: car._id,
        owner: car.owner,
        number_plate: {
          first: Number(car.number_plate.substr(0, 2)).toLocaleString("fa-IR"),
          second: toPersianPlate[car.number_plate.substr(2, 1)],
          third: Number(car.number_plate.substr(3, 3)).toLocaleString("fa-IR"),
          fourth: "ایران",
          fifth: Number(car.number_plate.substr(6, 2)).toLocaleString("fa-IR"),
        },
        brand: car.brand_id,
        color: car.color_id,
        camera_whitelist: car.camera_whitelist,
        time: car.create_date,
        __v: car.__v,
      },
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//add route for edit car
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get id from url
    let id: string = req.params.id;

    //verify body request
    if (!id) {
      req.flash("error", "Car id is required");
      return next(new ApiError(400, "Car id is required"));
    }
    //get body request
    const carBody = req.body;
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }
    //query for get car by id from DB and update
    let car: any = await Car.findByIdAndUpdate(id, carBody, { new: true }).exec();
    //return response not found to client if not found car
    if (!car) {
      req.flash("error", "Car not found");
      return next(new ApiError(404, "Car not found"));
    }

    let personnel = await Personnel.findById(car.owner).exec();
    let _owner = personnel != null ? `${personnel?.first_name} ${personnel?.last_name}` : "";
    let _brand = await CarBrand.findById(car.brand_id).exec();
    let _color = await CarColor.findById(car.color_id).exec();
    //return response to client with car
    return res.status(201).json({
      success: true,
      data: {
        _id: car._id,
        owner: _owner,
        number_plate: {
          first: Number(car.number_plate.substr(0, 2)).toLocaleString("fa-IR"),
          second: toPersianPlate[car.number_plate.substr(2, 1)],
          third: Number(car.number_plate.substr(3, 3)).toLocaleString("fa-IR"),
          fourth: "ایران",
          fifth: Number(car.number_plate.substr(6, 2)).toLocaleString("fa-IR"),
        },
        brand: _brand?.name ?? "",
        color: _color?.name ?? "",
        camera_whitelist: car.camera_whitelist,
        time: car.create_date,
        __v: car.__v,
      },
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

//add route for delete car
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
  try {
    let id: string = req.params.id;
    //verify body request
    if (!id) {
      req.flash("error", "Car id is required");
      return next(new ApiError(400, "Car id is required"));
    }

    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //query for get car by id from DB
    let car: any = await Car.findByIdAndDelete(id).exec();
    //return response not found to client if not found car
    if (!car) {
      req.flash("error", "Car not found");
      return next(new ApiError(404, "Car not found"));
    }

    let personnel = await Personnel.findById(car.owner).exec();
    let _owner = personnel != null ? `${personnel?.first_name} ${personnel?.last_name}` : "";
    let _brand = await CarBrand.findById(car.brand_id).exec();
    let _color = await CarColor.findById(car.color_id).exec();
    //return response to client with car
    return res.status(201).json({
      success: true,
      data: {
        _id: car._id,
        owner: _owner,
        number_plate: {
          first: Number(car.number_plate.substr(0, 2)).toLocaleString("fa-IR"),
          second: toPersianPlate[car.number_plate.substr(2, 1)],
          third: Number(car.number_plate.substr(3, 3)).toLocaleString("fa-IR"),
          fourth: "ایران",
          fifth: Number(car.number_plate.substr(6, 2)).toLocaleString("fa-IR"),
        },
        brand: _brand?.name ?? "",
        color: _color?.name ?? "",
        camera_whitelist: car.camera_whitelist,
        time: car.create_date,
        __v: car.__v,
      },
    });
  } catch (err: any) {
    return next(new ApiError(500, "internal server error" + err.message));
  }
});

export default router;
