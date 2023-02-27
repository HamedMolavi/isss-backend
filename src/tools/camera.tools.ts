const onvif = require("node-onvif");

export type CameraInfo = {
    ip: string;
    username: string;
    password: string;
};

export async function getStreamUri(camInfo: CameraInfo): Promise<string | undefined> {
    try {
        if (!camInfo.ip || !camInfo.username || !camInfo.password) {
            return; // input verify
        }
        //create new device for camera on type onvif
        var device = new onvif.OnvifDevice({
            xaddr: "http://" + camInfo.ip + ":80/onvif/device_service",
            user: camInfo.username,
            pass: camInfo.password,
        });
        await device.init(); //initial device
        let url: string = device.getUdpStreamUrl();
        url  = url.replace(/\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,"{username}:{password}@{ip}:554")
        return url;
    } catch (error) {
        console.log(error);
    }
}