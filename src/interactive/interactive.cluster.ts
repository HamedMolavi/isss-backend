import { spawn } from 'child_process';
let watchInterval: NodeJS.Timeout | undefined = undefined;
export async function setupInteractive(): Promise<void> {
	// Setup Interactive stdin
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function (key: string) {
		act(key.trim());
	});
}

async function act(action: string) {
	switch (
		true // explicit actions
	) {
		//------------------------------------------------------------------//
		case action == '\u0003': // ctrl-c
			console.log('EXITING!');
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
		case action.startsWith('watch'):
			const actionList: string[] = action.split(' ').slice(1);
			const commands: Array<string> = [];
			let timeout = 1000;
			let doClear = false;
			while (actionList.includes('&')) {
				const start = actionList.indexOf('&');
				const count =
					actionList.indexOf('&', start + 1) !== -1
						? actionList.indexOf('&', start + 1) - start
						: actionList.length + 1;
				commands.push(actionList.splice(start, count).slice(1).join(' '));
			}
			if (actionList.includes('-n')) {
				const start = actionList.indexOf('-n');
				const count = 2;
				timeout = parseInt(actionList.splice(start, count)[1]) * 1000;
			}
			if (actionList.includes('-c')) {
				const start = actionList.indexOf('-c');
				const count = 1;
				actionList.splice(start, count);
				doClear = true;
			}
			if (actionList.length > 0) {
				commands.push(actionList.join(' '));
			}
			console.log(`running commands \n\t${commands.join('\n\t')}\nevery ${timeout / 1000} sec...`);
			watchInterval = setInterval(() => {
				if (doClear) console.clear();
				for (const cmd of commands) act(cmd);
			}, timeout);
			break;
			break;
		//------------------------------------------------------------------//
		case action.startsWith('env'): {
			if (
				['proc', 'process', 'p', 'proces'].includes((action.split(' ').slice(1).at(-2) ?? '').toLowerCase())
			) {
				const name = action.split(' ').slice(1).at(-1);
				console.log(process[name as keyof NodeJS.Process]);
			} else if (
				['proc', 'process', 'p', 'proces'].includes((action.split(' ').slice(1).at(-1) ?? '').toLowerCase())
			) {
				console.log(process);
			} else {
				const name = action.split(' ').slice(1).at(-1);
				console.log(!!name ? process.env[name.toUpperCase() as keyof NodeJS.ProcessEnv] : process.env);
			}
			// const isInProcess = (action.split(" ").slice(1).at(-2) ?? action.split(" ").slice(1).at(-1) ?? "").toLowerCase() in ["proc", "process", "p", "proces"];
			break;
		}
		//------------------------------------------------------------------//
		case action.startsWith('exec'):
			const command = action.split(' ').slice(1).at(-1);
			if (!command) return console.log('command needed as argument of exec!');
			const cArgs = action.split(' ').slice(1, -1);
			const s = spawn(command, cArgs, { shell: true });
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
		case action == 'ps':
			const startCpuUsage = process.cpuUsage();
			setTimeout(() => {
				const totalCpu = (process.cpuUsage().user + process.cpuUsage().system) / 10e6; //sec
				const uptime = process.uptime();
				const cpuAveragePercentage = (totalCpu / uptime).toFixed(2);
				const diffCpuUsage = process.cpuUsage(startCpuUsage);
				const totalCpuDiff = (diffCpuUsage.user + diffCpuUsage.system) / 10e6; //sec
				const cpuPercentage = (totalCpuDiff / 0.05).toFixed(3);
				const memoryUsage = process.memoryUsage();
				const totalMemory =
					memoryUsage.rss + memoryUsage.heapTotal + memoryUsage.heapUsed + memoryUsage.external;
				const totalMemoryInMB = (totalMemory / (1024 * 1024)).toFixed(0);
				console.log('PPID\tPID\tCPU\tACPU\tMEM\tUPtime');
				console.log(
					`${process.ppid}\t${process.pid}\t${cpuPercentage}%\t${cpuAveragePercentage}%\t${totalMemoryInMB}MB\t${Math.floor(process.uptime())} s`
				);
			}, 50);
			break;
		//------------------------------------------------------------------//
		case action == 'stop':
			if (!!watchInterval) {
				clearInterval(watchInterval);
				watchInterval = undefined;
			}
			console.log('watch command stopped.');
			break;
		//------------------------------------------------------------------//
		default:
			console.log(`Unknown command (${action})!`);
			console.log('List of commands:');
			console.log('\tctrl-c');
			console.log('\tclear');
			console.log('\trs');
			console.log('\twatch [-n ?] [-c] command');
			console.log('\tenv [name]');
			console.log('\texec command');
			console.log('\tps');
			console.log('\tstop');
			break;
	}
}
