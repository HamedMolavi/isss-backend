import si from 'systeminformation';

export type ProcessInfoResult = {
  all: number
  running: number
  blocked: number
  sleeping: number
  processes?: si.Systeminformation.ProcessesProcessLoadData[]
  services?: si.Systeminformation.ServicesData[]
  description: string
};

export type Container = {
  name: string
  image: string
  state: string
  restartCount: number,
  ports: [Object],
  memUsage: number,
  cpuPercent: number,
  netIO: { rx: number, wx: number },
  networks: { [key: string]: Object },
};

export type DockerInfoResult = {
  totalContainers: number,
  totalContainersRunning: number,
  totalContainersPaused: number,
  totalContainersStopped: number,
  totalImages: number,
  memTotal: number,
  containers?: Container[]
  description: string
};