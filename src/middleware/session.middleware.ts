import session from "express-session";


export const sessionMiddleware = session({
  name: "Bearer",
  secret: "Hello Mother Fucker!",
  resave: false,//if you want to keep the session in case of user activity, set these both to true.
  rolling: false,//if you want to keep the session in case of user activity, set these both to true.
  saveUninitialized: false,
  cookie: {
    maxAge: undefined,
    httpOnly: true,
  },
});