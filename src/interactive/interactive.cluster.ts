import { spawn } from "child_process";
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
      let actionList: string[] = action.split(" ").slice(1);
      let commands: Array<string> = [];
      let timeout = 1000;
      let doClear = false;
      while (actionList.includes("&")) {
        let start = actionList.indexOf("&");
        let count = actionList.indexOf("&", start + 1) !== -1 ? actionList.indexOf("&", start + 1) - start : actionList.length + 1;
        commands.push(actionList.splice(start, count).slice(1).join(" "))
      } if (actionList.includes("-n")) {
        let start = actionList.indexOf("-n");
        let count = 2;
        timeout = parseInt(actionList.splice(start, count)[1]) * 1000;
      } if (actionList.includes("-c")) {
        let start = actionList.indexOf("-c");
        let count = 1;
        actionList.splice(start, count);
        doClear = true;
      } if (actionList.length > 0) {
        commands.push(actionList.join(" "))
      };
      console.log(`running commands \n\t${commands.join("\n\t")}\nevery ${timeout / 1000} sec...`);
      watchInterval = setInterval(() => {
        if (doClear) console.clear();
        for (const cmd of commands) act(cmd);
      }, timeout);
      break;
      break;
    //------------------------------------------------------------------//
    case action.startsWith("env"): {
      if (["proc", "process", "p", "proces"].includes((action.split(" ").slice(1).at(-2) ?? "").toLowerCase())) {
        let name = action.split(" ").slice(1).at(-1);
        console.log(process[name as keyof NodeJS.Process]);
      } else if (["proc", "process", "p", "proces"].includes((action.split(" ").slice(1).at(-1) ?? "").toLowerCase())) {
        console.log(process);
      } else {
        let name = action.split(" ").slice(1).at(-1);
        console.log(!!name ? process.env[name.toUpperCase() as keyof NodeJS.ProcessEnv] : process.env);
      };
      // let isInProcess = (action.split(" ").slice(1).at(-2) ?? action.split(" ").slice(1).at(-1) ?? "").toLowerCase() in ["proc", "process", "p", "proces"];
      break;
    }
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
      let startCpuUsage = process.cpuUsage();
      setTimeout(() => {
        let totalCpu = (process.cpuUsage().user + process.cpuUsage().system) / 10E6; //sec
        let uptime = process.uptime();
        let cpuAveragePercentage = (totalCpu / uptime).toFixed(2);
        let diffCpuUsage = process.cpuUsage(startCpuUsage);
        let totalCpuDiff = (diffCpuUsage.user + diffCpuUsage.system) / 10E6; //sec
        let cpuPercentage = (totalCpuDiff / 0.05).toFixed(3);
        const memoryUsage = process.memoryUsage();
        const totalMemory = memoryUsage.rss + memoryUsage.heapTotal + memoryUsage.heapUsed + memoryUsage.external;
        const totalMemoryInMB = (totalMemory / (1024 * 1024)).toFixed(0);
        console.log("PPID\tPID\tCPU\tACPU\tMEM\tUPtime");
        console.log(`${process.ppid}\t${process.pid}\t${cpuPercentage}%\t${cpuAveragePercentage}%\t${totalMemoryInMB}MB\t${Math.floor(process.uptime())} s`);
      }, 50);
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