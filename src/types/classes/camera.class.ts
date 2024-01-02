import { ICameraInfo } from "../interfaces/camera.interface";
import { IFailoverStrategy } from "../interfaces/strategy.interface";
import { NextFunction } from "express";
import { ApiError } from "./error.class";
const onvif = require("node-onvif");

export class getStreamUriStrategy implements IFailoverStrategy {
    args: { first: ICameraInfo, second: ICameraInfo["nvr"], error: NextFunction } & IFailoverStrategy["args"];
    strategies: ((...params: any[]) => any)[];

    constructor(args: { first: ICameraInfo, second: ICameraInfo["nvr"], error: NextFunction }) {
        this.args = args;
        this.strategies = strategies;
    };
    // do its goal: get stream uri
    async do(): Promise<string> {
        for (const strategy of this.strategies) {
            try {
                return await strategy(this.args[strategy.name]);
            } catch (err) {
                //do a little error loging or just ignore it
            };
        };
        // failed to get stream so return empty
        return "";
    };
};


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const strategies: ((...params: any[]) => any)[] = [
    async function first(camInfo: ICameraInfo): Promise<string> {
        let device = new onvif.OnvifDevice({
            xaddr: "http://" + camInfo.ip + ":80/onvif/device_service",
            user: camInfo.username,
            pass: camInfo.password,
        });
        await device.init(); //initial device
        let uri = device.getUdpStreamUrl();
        uri = uri?.replace(
            /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            "{username}:{password}@{ip}:554"
        );
        return uri;
    },
    async function second(nvr: string): Promise<string> {
        const SAMPLE_STREAM_URI = process.env["SAMPLE_STREAM_URI"];
        const WORD_BEFORE_REPLACE_STREAM = process.env["WORD_BEFORE_REPLACE_STREAM"];
        const WORD_AFTER_REPLACE_STREAM = process.env["WORD_AFTER_REPLACE_STREAM"];
        if (!SAMPLE_STREAM_URI || !WORD_BEFORE_REPLACE_STREAM || !WORD_AFTER_REPLACE_STREAM) throw new Error();
        let uri = SAMPLE_STREAM_URI?.replace(
            /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            "{username}:{password}@{ip}"
        );
        uri = uri?.replace(WORD_BEFORE_REPLACE_STREAM, WORD_AFTER_REPLACE_STREAM + nvr);
        return uri;
    },
    async function third(camInfo): Promise<string> {
        return 'rtsp://{username}:{password}@{ip}:554/live'; // best guess
    },
    async function error(next: NextFunction) {
        next(new ApiError(500, "Internal Error!"));
    }
];