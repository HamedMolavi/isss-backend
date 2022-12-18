"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const onvif = require("node-onvif");
//take snapshot from camera with ip , username , password
function takeSnapshot(camInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!camInfo.ip || !camInfo.username || !camInfo.password) {
                return null; // input verify
            }
            //create new device for camera on type onvif
            var device = new onvif.OnvifDevice({
                xaddr: "http://" + camInfo.ip + ":80/onvif/device_service",
                user: camInfo.username,
                pass: camInfo.password,
            });
            yield device.init(); //initial device
            console.log("fetching the data of the snapshot...");
            let res = yield device.fetchSnapshot(); //fetch image from camera
            //convert result from binary to base64
            let mimeType = res.headers["content-type"];
            let rawImage = res.headers["accept-ranges"];
            let prefix = "data:" + mimeType + ";base64,";
            let base64Image = Buffer.from(res.body, rawImage).toString("base64");
            let image = prefix + base64Image;
            return image;
        }
        catch (error) {
            console.log(error);
        }
    });
}
exports.default = takeSnapshot;
