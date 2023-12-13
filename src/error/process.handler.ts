//for get unhandeled error in express
export default function setExceptionHandler() {
  const errorTypes = ['unhandledRejection', 'uncaughtException']
  const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2']
  errorTypes.forEach(type => {
    process.on(type, async (e: any) => {
      try {
        console.error(`process.on ${type}`)
        console.error(e)
        process.kill(process.ppid);
      } catch (_) {
        process.kill(process.ppid);
      };
    });
  });
  signalTraps.forEach(type => {
    process.once(type, async () => {
      try {
      } finally {
        process.kill(process.pid, type)
      };
    });
  });
};


