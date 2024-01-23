//for get unhandeled error in express
export default function setExceptionHandler() {
  const errorTypes = ['unhandledRejection', 'uncaughtException']
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']
  errorTypes.forEach(type => {
    process.on(type, async (e) => {
      try {
        console.error(`process.on ${type}`)
        console.error(`Error message: ${e.message}`);
        console.error(`Stack trace: ${e.stack}`);
      } catch (_) {
        console.error(e)
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


