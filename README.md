# Server

## Versioning

2

* 2.0.0: lts
* 2.0.1: Jimp image file routes and image dto validation changed

3

* 3.0.0: Product management
* 3.0.1: Product management lts (+ Jimp image file routes and image dto validation changed)
* 3.0.2: delete elastic logs routes
* 3.0.3: Camera and Schedule License check alteration

## Structure

```js
server.ts
  ├ /types/index => globalize custom-defined types
  │ ├ global
  │ ├ express-session
  │ └ http
  │
  ├ /config/env.config => read and set env variables
  │ ├ defaultEnvVars
  │ └ dotenv
  │
  ├ /setups/index => setupInteractive, connectToDBs, setUpPassport
  │
  └ app => Create httpServer, httpsServer
    │
    ├ middlewares
    │ ├ cors
    │ ├ cookie-parser[cookieParser]
    │ ├ middleware/auth.middleware[authHeaderExtraction]
    │ ├ middleware/session.middleware[sessionMiddleware]
    │ ├ passport.initialize(), passport.session()
    │ └ body-parser[bodyParser][json, urlencoded, text]
    │
    ├ routes
    │   ├ /auth/login => routes/auth/login.Routes
    │   │   └ [POST] [/] === `register new user`
    │   │       ├ dtoValidationMiddleware(loginDto) => /validation/dto/index, /validation/dto/login.dto
    │   │       ├ assignPassport => /authentication/authorize.auth
    │   │       └ sendTokenToclient => /authentication/authorize.auth
    │   │ 
    │   ├ passportGate => /authentication/authorize.auth
    │   │   
    │   ├ /config/user => routes/config/userConfig.Routes
    │   │  ├ accessCheck => /authentication/accessCheck.auth
    │   │  │    └ Access.Configuration => /types/enums/access.enum
    │   │  │
    │   │  ├ /cameras => routes/config/camera.Routes
    │   │  │    ├ [POST] [/] === `register new camera`
    │   │  │    │   ├ dtoValidationMiddleware(CreateCameraBody) => /validation/dto/index, /validation/dto/camera.dto
    │   │  │    │   ├ existCheck((Camera, {$and: [{ ip: "ip" }, { nvr: "nvr" }]})) => /validation/db
    │   │  │    │   ├ getStreamUri(CameraInfoKeys) => /tools/camera.tools
    │   │  │    │   └ create([section_id,nvr,ip,name,username,password,network,is_enabled,muted,camera_type,url], Camera)
    │   │  │    │                                                                            => /db/mongo/create.database
    │   │  │    ├ [GET] [/] === `read all cameras`
    │   │  │    │   └ readMiddleware(Camera) => /db/mongo/read.database, /db/mongo/models/camera
    │   │  │    │
    │   │  │    ├ [GET] [/:id] === `read camera by id`
    │   │  │    │   └ readByIdMiddleware(Camera) => /db/mongo/read.database, /db/mongo/models/camera
    │   │  │    │
    │   │  │    ├ [PATCH] [/:id] === `edit camera by id`
    │   │  │    │   └ updateById(Camera) => /db/mongo/update.database, /db/mongo/models/camera
    │   │  │    │
    │   │  │    └ [DELETE] [/:id] === `delete camera by id`
    │   │  │       └ deleteById(Camera) => /db/mongo/delete.database, /db/mongo/models/camera
    │   │  │
    │   │  ├ /files
    │   │  │    ├ [POST] [/upload] === `upload image`
    │   │  │    │   └ uploadAvatar("image_str", "perssonel_id") => /tools/redisFile.tools
    │   │  │    │
    │   │  │    ├ [GET] [/download/:fileName] === `download image by file name`
    │   │  │    │   ├ ?
    │   │  │    │
    │   │  │    ├ [GET] [/list] === `download image by file name`
    │   │  │    │   ├ ?
    │   │  │    │
    │   │  │    ├ [POST] [/redis] === `download image by file name`
    │   │  │    │   ├ redis.middlewareWraper(redis.redisSave, { isInReq: true }, "personnel_id", "image_str"));
    │   │  │    │
    │   │  │    ├ [POST] [/verify] === `download image by file name`
    │   │  │    │   ├ redis.middlewareWraper(redis.redisGet, { save: "redisData", isInReq: true }, "id"),
    │   │  │    │   ├ ?
    │   │  │
    │   │  ├ /departments
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /sections
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /jobtitles
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /personnels
    │   │  │    ├ [CRUD]
    │   │  │    ├ [SEARCH]
    │   │  │
    │   │  ├ /cars
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /schedules
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /models
    │   │  │    ├ [GET] [/] => read models
    │   │  │    ├ [GET] [/:category] => read by category
    │   │  │
    │   │  ├ /carcolors
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /carbrands
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /modelToCameras
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /departementfiles
    │   │  │    ├ [GET] => read
    │   │  │
    │   │  ├ /personImage
    │   │  │    ├ [GET] [/:id] => base64 of person images in local storage
    │   │  │    ├ [DELETE] [/:hashid] => delete image from folder assets\image by hashid
    │   │  │
    │   │  ├ /notifications
    │   │  │    ├ [CRUD]
    │   │  │
    │   │  ├ /testsms
    │   │  │    ├ [GET] [/:phone_number] => test send sms
    │   │  │
    │   │  ├ /testemail
    │   │  │    ├ [GET] [/:email] => test send email
    │   │  │
    │   │  ├ /snapshot
    │   │  │    ├ [GET] [/:id] => get snapshot from camera with ip+username+password and send snapshotBase64
    │   │
    │   │
    │   ├ /config/admin => routes/config/adminConfig.Routes
    │   │  ├ accessCheck
    │   │  │     Access.Configuration => /types/enums/access.enum
    │   │  │
    │   │  └ /users
    │   │       ├ [CRUD]
    │   │
    │   ├ /reports => routes/report/report.Routes
    │   │  ├ [POST] [/:model] => get logs of model based on time from ElasticSearch
    │   │
    │   ├ /reportDepartmets => routes/report/departmentReport.Routes
    │   │  ├ [POST] [/] => WTF?
    │   │
    │   ├ /schedulesreport => routes/report/schedulesReport.Routes
    │   │  ├ [GET] [/] => [Schedule[modelToCamera] for Camera[Model][modelToCamera] in Camera] but sends cameras and their models
    │   │  ├ [GET] [/:id] => Exactly as above!
    │   │
    │   └ /downloadVideo => routes/report/videoDownload.Routes
    │      ├ [GET] [/:id] => Reads a video file, converts it to mp4 (using ffmpeg) and sends it chunk by chunk
    │
    └ notFound
```

## Database

placeholder

## Migrate

```text
/api/v1/users/login => /api/v1/auth/login

/api/v1/cameras ===========> /api/v1/config/user/cameras
/api/v1/files -------------> /api/v1/config/user/files
/api/v1/departments =======> /api/v1/config/user/departments
/api/v1/sections ----------> /api/v1/config/user/sections
/api/v1/jobtitles =========> /api/v1/config/user/jobtitles
/api/v1/personnels --------> /api/v1/config/user/personnels
/api/v1/cars ==============> /api/v1/config/user/cars
/api/v1/schedules ---------> /api/v1/config/user/schedules
/api/v1/models ============> /api/v1/config/user/models
/api/v1/carcolors ---------> /api/v1/config/user/carcolors
/api/v1/carbrands =========> /api/v1/config/user/carbrands
/api/v1/modelToCameras ----> /api/v1/config/user/modelToCameras
/api/v1/departementfiles ==> /api/v1/config/user/departementfiles
/api/v1/personImage -------> /api/v1/config/user/personImage
/api/v1/notifications =====> /api/v1/config/user/notifications
/api/v1/testsms -----------> /api/v1/config/user/testsms
/api/v1/testemail =========> /api/v1/config/user/testemail
/api/v1/snapshot ----------> /api/v1/config/user/snapshot

/api/v1/users =============> /api/v1/config/admin/users

/api/v1/reports ----------> Same
/api/v1/reportDepartmets => Same
/api/v1/schedulesreport --> Same
/api/v1/downloadVideo ====> Same

/api/v1/alerts => Deprecated
```

## Flows

### Personnel and Person Image

#### Create a Person

```ts
 /*   POST /api/v1/config/user/personnels   */
interface CreatePersonnelBody {
  first_name: string;
  last_name: string;
  national_code: string;
  email?: string |  null
  phone_number: string| null;
  job_id?: mongoose.Types.ObjectId;
  section_id?: mongoose.Types.ObjectId| null;
  tracked?: boolean| null;
  personnel_code: string| null;
  camera_whitelist?: string[]| null;
  department_whitelist?: string[]| null;
  section_whitelist?: string[]| null;
  schedule_whitelist?: string[]| null;
  is_active: boolean| null;
  time_start?: string;
  date_start?: string;
  time_end?: string;
  date_end?: string;
};
```

Exist Check is done with:  
OR:

* national_code
* personnel_code

Save the person. Then save its avatar:

* image: Buffer from (base64 recv from UI, sliced from ",")
* path: /isss-backend/assets/personnel_id/avatar.jpeg