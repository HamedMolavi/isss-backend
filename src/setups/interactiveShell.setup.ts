import { spawn } from "child_process";
//TODO: add more commands
const stdin = process.stdin;
let watchInterval: NodeJS.Timeout | undefined = undefined;
export async function setupInteractive(): Promise<void> {
  // Setup Interactive stdin
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (key: string) {
    act(key.trim());
  });
};

async function act(action: string) {
  switch (true) { // explicit actions
    //------------------------------------------------------------------//
    case action == '\u0003':// ctrl-c
      console.log("EXITING!");
      process.kill(process.ppid);
    //------------------------------------------------------------------//
    case action == 'clear':
      console.clear();
      break;
    //------------------------------------------------------------------//
    case action == 'rs':
      process.exit(0);
      break;
    //------------------------------------------------------------------//
    case action.startsWith("watch"):
      let cmd = action.split(" ").slice(1).at(-1);
      if (!cmd) return console.log("command needed as argument of watch!");
      let args = action.split(" ").slice(1, -1);
      let timeout = args.includes("-n") ? parseInt(args[args.indexOf("-n") + 1]) * 1000 : 1000;
      let doClear = args.includes("-c") ? true : false;
      console.log(`running command ${cmd} every ${timeout / 1000} sec...`);
      watchInterval = setInterval(() => {
        if (doClear) console.clear();
        act(cmd as string);
      }, timeout);
      break;
    //------------------------------------------------------------------//
    case action.startsWith("env"):
      let name = action.split(" ").slice(1).at(-1);
      console.log(!!name ? process.env[name] : process.env);
      break;
    //------------------------------------------------------------------//
    case action.startsWith("exec"):
      let command = action.split(" ").slice(1).at(-1);
      if (!command) return console.log("command needed as argument of exec!");
      let cArgs = action.split(" ").slice(1, -1);
      let s = spawn(command, cArgs, { shell: true });
      s.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      s.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });
      s.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });
      break;
    //------------------------------------------------------------------//
    case action == "ps":
      let totalCpu = (process.cpuUsage().user + process.cpuUsage().system) / 10E6; //sec
      let uptime = process.uptime();
      let cpuPercentage = (totalCpu / uptime).toFixed(2);
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.rss + memoryUsage.heapTotal + memoryUsage.heapUsed + memoryUsage.external;
      const totalMemoryInMB = (totalMemory / (1024 * 1024)).toFixed(1);
      console.log("parent PID\tPID\tCPU\t\tMEM\tUPtime");
      console.log(`${process.ppid}\t\t${process.pid}\t${cpuPercentage}%\t\t${totalMemoryInMB}MB\t${Math.floor(uptime)} s`);
      break;
    //------------------------------------------------------------------//
    case action == "stop":
      if (!!watchInterval) {
        clearInterval(watchInterval);
        watchInterval = undefined;
      };
      console.log("watch command stopped.")
      break;
    //------------------------------------------------------------------//
    default:
      console.log(`Unknown command (${action})!`);
      console.log("List of commands:");
      console.log("\tctrl-c");
      console.log("\tclear");
      console.log("\trs");
      console.log("\twatch [-n ?] [-c] command");
      console.log("\tenv [name]");
      console.log("\texec command");
      console.log("\tps");
      console.log("\tstop");
      break;
  };



};