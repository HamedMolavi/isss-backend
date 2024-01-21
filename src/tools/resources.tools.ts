import si from 'systeminformation';
import { Container, DockerInfoResult, ProcessInfoResult } from '../types/interfaces/systemInfo.interface';

export async function cpuInfo() {
  const cpu = await si.cpu();
  const cpuSpeed = await si.cpuCurrentSpeed();
  const cpuLoad = await si.currentLoad();

  const cpuDescription = [
    [cpu.brand, ": Total speed", cpu.speed].join(" "),
    [cpu.cores, "cores"].join(" "),
    [cpu.physicalCores, "phisical cores"].join(" "),
    [cpuSpeed.avg, "GHz speed in use"].join(" "),
    [(cpuLoad.currentLoad).toFixed(2), "% total cpu usage"].join(" "),
    [(cpuLoad.currentLoadUser).toFixed(2), "% user cpu usage"].join(" "),
    [(cpuLoad.currentLoadSystem).toFixed(2), "% system cpu usage"].join(" "),
  ].join(" - ");

  return {
    brand: cpu.brand,
    cores: cpu.cores,
    physicalCores: cpu.physicalCores,
    total: cpu.speed,
    used: cpuSpeed.avg,
    free: cpu.speed - cpuSpeed.avg,
    currentLoad: cpuLoad.currentLoad,
    currentLoadUser: cpuLoad.currentLoadUser,
    currentLoadSystem: cpuLoad.currentLoadSystem,
    description: cpuDescription
  };
};

export async function memInfo() {
  const mem = await si.mem()
  const memDescription = [
    ["Memory:", (mem.total / (1024 ** 3)).toFixed(2), "Total", (mem.used / (1024 ** 3)).toFixed(2), "Used", (mem.free / (1024 ** 3)).toFixed(2), "Free"].join(" "),
    ["Swap:", (mem.swaptotal / (1024 ** 3)).toFixed(2), "Total", (mem.swapused / (1024 ** 3)).toFixed(2), "Used", (mem.swapfree / (1024 ** 3)).toFixed(2), "Free"].join(" "),
  ].join(" - ");

  return {
    total: mem.total,
    free: mem.free,
    used: mem.used,
    swaptotal: mem.swaptotal,
    swapfree: mem.swapfree,
    swapused: mem.swapused,
    description: memDescription
  };
};

export async function timeInfo() {
  const time = si.time();
  const memDescription = [
    ["Time", new Date(time.current), "Timezone", time.timezoneName, `(${time.timezone})`].join(" "),
    ["UpTime", time.uptime / (60 * 60 * 24)].join(" "),
    ["UpTime", time.uptime / (60 * 60 * 24)].join(" "),
  ].join(" - ");

  return {
    ...time,
    description: memDescription
  }
};

export function controllerToString(controller: si.Systeminformation.GraphicsControllerData) {
  return [
    "GPU:", controller.model,
    "Total Memory", controller.memoryTotal ?? "Unsupported",
    "Used Memory", controller.memoryUsed ?? "Unsupported",
    "Free Memory", controller.memoryFree ?? "Unsupported",
    "Util GPU", controller.utilizationGpu ?? "Unsupported",
    "VRAM", controller.vram ?? "Unsupported",
  ].join(" ")
};

export async function gpuInfo() {
  const graphics = await si.graphics()

  const gpuDescription = [
    ...graphics.controllers.map(controllerToString),
    ...graphics.displays.map((monitor) => "Monitor: " + (!!monitor.model ? monitor.model : "Unknown")),
  ].join(" - ");

  return {
    gpus: graphics.controllers.map((ctrl) => {
      return {
        memoryTotal: ctrl.memoryTotal,
        memoryUsed: ctrl.memoryUsed,
        memoryFree: ctrl.memoryFree,
        utilizationGpu: ctrl.utilizationGpu,
        utilizationMemory: ctrl.utilizationMemory,
        model: ctrl.model,
        vram: ctrl.vram
      }
    }),
    displays: graphics.displays.map((monitor) => { return { "model": monitor.model } })
  };
};

export async function processInfo(processesOrServices?: Array<string>) {
  const processes = await si.processes();

  let result: ProcessInfoResult = {
    all: processes.all,
    running: processes.running,
    blocked: processes.blocked,
    sleeping: processes.sleeping,
    description: ""
  };
  let procDescription = [`Total ${processes.all} Running ${processes.running}`];
  if (!!processesOrServices && !!processesOrServices.length) {
    const userProcessInfo = await si.processLoad(processesOrServices.join(","));
    userProcessInfo.forEach(proc => procDescription.push(`Process ${proc.proc} pid ${proc.pid} cpu ${proc.cpu} mem ${proc.mem}`));
    const userServicenfo = await si.services(processesOrServices.join(","));
    userServicenfo.forEach(service => procDescription.push(`Service ${service.name} cpu ${service.cpu} mem ${service.mem}`));
    result = { ...result, processes: userProcessInfo, services: userServicenfo };
  };

  result["description"] = procDescription.join(" - ");

  return result;
};

export async function dockerInfo(containers?: Array<string>) {
  const dockers = await si.dockerInfo();

  let result: DockerInfoResult = {
    totalContainers: dockers.containers,
    totalContainersRunning: dockers.containersRunning,
    totalContainersPaused: dockers.containersPaused,
    totalContainersStopped: dockers.containersStopped,
    totalImages: dockers.images,
    memTotal: dockers.memTotal,
    description: ""
  };
  let dockerDescription = [`Total Containers ${dockers.containers} Running ${dockers.containersRunning}`];
  if (!!containers && !!containers.length) {
    const userContainerInfo = await si.dockerAll().then((dockers: Container[]) => {
      if (!!dockers && !!dockers?.length) {
        return dockers.filter((docker) => containers.some((container) => container.match(docker.name)))
      } else return []
    });
    userContainerInfo.forEach(container => dockerDescription.push(`Container ${container.name} ${container.state} Image ${container.image} cpu ${container.cpuPercent}% mem ${container.memUsage}`));

    result = { ...result, containers: userContainerInfo };
  };

  result["description"] = dockerDescription.join(" - ");

  return result;
};


export async function networkInfo(containers?: Array<string>) {
  //   await si.networkConnections()
  // [
  //   {
  //     protocol: 'tcp4',
  //     localAddress: '192.168.0.27',
  //     localPort: '55788',
  //     peerAddress: '163.128.xxx.xxx',
  //     peerPort: '443',
  //     state: 'CLOSE_WAIT',
  //     pid: 702,
  //     process: ''
  //   },
  //   {
  //     protocol: 'tcp4',
  //     localAddress: '192.168.0.27',
  //     localPort: '55761',
  //     peerAddress: '148.253.xxx.xxx',
  //     peerPort: '22',
  //     state: 'ESTABLISHED',
  //     pid: 7267,
  //     process: ''
  //   },
  //   ...
  // ]

  const inetCheck = await si.inetChecksite("http://www.google.com");
  // { url: 'http://www.google.com', ok: true, status: 200, ms: 1866 }
  const networks = await si.networkStats();
  return {
    connected: inetCheck.ok,
    networks
  };
};


export async function systemResourceUsage() {
  try {
    const cpuUsage = await si.currentLoad();
    const memoryUsage = await si.mem();
    const networkStats = await si.networkStats();
    const graphics = await si.graphics();

    const totalMemory = memoryUsage.total;
    const freeMemory = memoryUsage.free;
    const usedMemory = totalMemory - freeMemory;

    const totalCPU = cpuUsage.cpus.reduce((sum, cpu) => sum + cpu.load, 0);
    const averageCPU = totalCPU / cpuUsage.cpus.length;

    const totalNetworkReceived = networkStats.reduce((sum, stats) => sum + stats.rx_bytes, 0);
    const totalNetworkTransmitted = networkStats.reduce((sum, stats) => sum + stats.tx_bytes, 0);

    let gpuUsage = {};
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
      const controller = graphics.controllers[0];
      gpuUsage = {
        name: controller.model,
        totalMemory: controller.vram,
        usedMemory: controller.vramDynamic ? 'Dynamic' : 'Unknown'
      };
    }

    return {
      totalMemory,
      usedMemory,
      freeMemory,
      totalCPU,
      averageCPU,
      totalNetworkReceived,
      totalNetworkTransmitted,
      gpuUsage
    };
  } catch (e) {
    console.log(e)
  };
};

export const resourceFunctions = {
  "cpu": cpuInfo,
  "mem": memInfo,
  "time": timeInfo,
  "gpu": gpuInfo,
  "process": processInfo,
  "docker": dockerInfo,
  "network": networkInfo,
  "all": systemResourceUsage,
};