import passport from 'passport';
import User from '../db/mongo/models/user';
import passportLocal from 'passport-local';

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
	passport.deserializeUser(function (id: string, done: Function) {
		// uses the key (id) to retrive user object
		User.findById(id)
			// user object attaches to the request as req.user
			.then((user) => (user ? done(null, user.toJSON()) : done(null, false, { message: 'Bad Request' })))
			.catch((err) => done(err, null));
	});
	passport.use(
		'login', // name of strategy
		new LocalStrategy(
			//for authentication user with username and password
			function auth(username: string, password: string, done: Function) {
				User.findOne({ username: username }) // find user by username
					.then(async (user) => {
						// Check if user exists and password is correct
						if (!user || !(await user.checkPassword(password))) {
							return null;
						}
						// Check if user is active
						if (!user.is_active) {
							return null;
						}
						return user;
					})
					.then(async (user) => {
						if (!!user)
							await User.updateOne(
								{ _id: user._id },
								{ $set: { last_login: new Date() } },
								{ new: false, returnDocument: 'after' }
							);
						return user;
					}) // examine the password
					.then((user) =>
						user
							? done(null, user.toJSON())
							: done(null, false, { message: 'username or password incorrect.' })
					)
					.catch((err) => done(err));
			}
		)
	);
}
