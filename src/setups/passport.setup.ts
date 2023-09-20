import passport from "passport";
import User from "../db/mongo/models/user";
import passportLocal from "passport-local";

const LocalStrategy = passportLocal.Strategy;

/* How passport runs over a request:
if it is new -> authenticate() => serializeUser()
if coockie session detected -> deserializeUser() => authenticate() => serializeUser()
*/

//create local strategy for passport authentication (login) with username and password
export function setUpPassport() {
  // persistent login sessions for authenticated user
  passport.serializeUser(function (user: any, done: Function) {
    done(null, user._id); // which data of the user object should be stored in the session
    // saved to session -> req.session.passport.user = {id:"xyz"}.
  });
  passport.deserializeUser(function (id: string, done: Function) { // uses the key (id) to retrive user object
    User.findById(id)
      // user object attaches to the request as req.user
      .then(user => user ? done(null, user.toJSON()) : done(null, false, { message: "Bad Request" })) // TODO: delete password property from user.
      .catch(err => done(err, null))
  });
  passport.use(
    "login", // name of strategy
    new LocalStrategy(
      //for authentication user with username and password
      function auth(username: string, password: string, done: Function) {
        User.findOne({ username: username })
          .then(async user => user ? await user.checkPassword(password) ? user : null : null)
          .then(user => user ? done(null, user.toJSON()) : done(null, false, { message: "username or password incorrect." }))
          .catch(err => done(err));
      }
    )
  );
};
