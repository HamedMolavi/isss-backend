//for get unhandeled error in express
export default function setExceptionHandler() {
  const errorTypes = ['unhandledRejection', 'uncaughtException']
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']
  errorTypes.forEach(type => {
    process.on(type, async (e) => {
      try {
        // TODO: please find the source of this error and solve it!
        if (!!e.message?.includes("Operation `Personnel.find()` buffering timed out after")) {
          console.error(`Error But its OK !!!!! ${e.message}`);
        } else {
          console.error(`process.on ${type}`);
          console.error(`Error message: ${e.message}`);
          console.error(`Stack trace: ${e.stack}`);
          process.exit();
        }
      } catch (_) {
        console.error(e);
      };
    });
  });
  signalTraps.forEach(type => {
    process.on(type, async () => {
      try {
      } finally {
        process.kill(process.pid, type)
      };
    });
  });
};


