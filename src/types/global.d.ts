export {}
declare global {
  namespace NodeJS {
    interface Process {
      CONSUMERS: Map<string, Consumer | undefined>;
      MODELS: string[];
    };
  };
  namespace Express {
    interface User extends IUser { };
    interface Request {
      session: session.Session & Partial<session.SessionData> & { user: User };
    };
  };
};
