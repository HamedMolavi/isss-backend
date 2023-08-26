import session from "express-session";
import redisStore from "../db/redis/store.database";


export const sessionMiddleware = session({
  store: redisStore(),
  name: "Bearer",
  secret: process.env["SESSION_SECRET"] as string, // TODO: remove as string
  resave: false,//if you want to keep the session in case of user activity, set these both to true.
  rolling: false,//if you want to keep the session in case of user activity, set these both to true.
  saveUninitialized: false,
  cookie: {
    maxAge: undefined,
    httpOnly: true,
  },
});