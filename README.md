```js
│┌┬┐║╔╦╗
─├┼┤═╠╬╣
│└┴┘║╚╩╝


server.ts
  ├ /types/index => globalize custom-defined types
  ├ /config/env.config => read and set env variables
  ├ /setups/index => setupInteractive, connectToDBs, setUpPassport
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
    │   │  │
    │   │  ├ /departments
    │   │  ├ /sections
    │   │  ├ /jobtitles
    │   │  ├ /personnels
    │   │  ├ /cars
    │   │  ├ /schedules
    │   │  ├ /models
    │   │  ├ /carcolors
    │   │  ├ /carbrands
    │   │  ├ /modelToCameras
    │   │  ├ /departementfiles
    │   │  ├ /personImage
    │   │  ├ /notifications
    │   │  ├ /testsms
    │   │  ├ /testemail
    │   │  ├ /snapshot
    │   │
    │   ├ /config/admin => routes/config/adminConfig.Routes
    │   │  ├ accessCheck
    │   │       ├ Access.Configuration => /types/enums/access.enum
    │   │
    │   ├ /reportDepartmets => routes/report/departmentReport.Routes
    │   ├ /reports => routes/report/report.Routes
    │   ├ /schedulesreport => routes/report/schedulesReport.Routes
    │   ├ /downloadVideo => routes/report/videoDownload.Routes
    │
    │
    └ notFound
```