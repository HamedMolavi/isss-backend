//import this file to correct global and modular types
import {} from './types/index';
//initial file .env
import envConfig from './config/env.config';
//process error handling
import processHandler from './error/process.handler';

// Initialize configurations
envConfig(); //sync
processHandler(); //sync

//imports
import http from 'http';
import https from 'https';
import app, { initializeApp } from './app/app.Application';
import setup from './setups/index';
import { run } from './interactive/index.cluster';

async function main() {
	await setup();
	await initializeApp();

	const { OPTIONS, PORT_HTTPS, PORT_HTTP, HOST } = process.env;

	// Server instances for potential cleanup
	let httpsServer: https.Server | null = null;
	let httpServer: http.Server | null = null;

	//                             SETUP YOUR SERVERS
	////////////////////////////////////////////////////////////////////////////

	// Setup HTTPS server with proper error handling
	if (OPTIONS) {
		try {
			const httpsOptions = JSON.parse(OPTIONS as string);
			httpsServer = https
				.createServer(httpsOptions, app)
				.listen(PORT_HTTPS, () => {
					console.log(`HTTPS Server is running on https://${HOST}:${PORT_HTTPS}`);
				})
				.on('error', (error) => errorHandler(error, 'HTTPS'));
		} catch (error) {
			console.error('Failed to start HTTPS server:', error);
			console.log('Continuing with HTTP server only...');
		}
	} else {
		console.warn('SSL OPTIONS not found. HTTPS server will not be started.');
	}

	// Setup HTTP server
	httpServer = http
		.createServer(app)
		.listen(PORT_HTTP, () => {
			console.log(`HTTP Server is running on http://${HOST}:${PORT_HTTP}`);
		})
		.on('error', (error) => errorHandler(error, 'HTTP'));
	////////////////////////////////////////////////////////////////////////////

	function errorHandler(error: Error & { syscall?: string; code?: string }, serverType: string) {
		if (error.syscall && error.syscall !== 'listen') throw error; // handling only listen errors

		const port = serverType === 'HTTPS' ? PORT_HTTPS : PORT_HTTP;
		const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

		switch (error.code) {
			case 'EACCES':
				console.error(`${serverType} Server - ${bind} requires elevated privileges`);
				break;
			case 'EADDRINUSE':
				console.error(`${serverType} Server - ${bind} is already in use`);
				break;
			default:
				console.error(`${serverType} Server error:`, error);
				break;
		}
		process.exit(1);
	}

	// Graceful shutdown handler
	process.on('SIGTERM', () => {
		console.log('SIGTERM received. Shutting down gracefully...');
		if (httpsServer) httpsServer.close();
		if (httpServer) httpServer.close();
	});

	process.on('SIGINT', () => {
		console.log('SIGINT received. Shutting down gracefully...');
		if (httpsServer) httpsServer.close();
		if (httpServer) httpServer.close();
	});
}

run(main);
