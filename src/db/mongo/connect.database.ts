import mongoose from "mongoose";
import Camera from "./models/camera";

// Connect to the database 
async function connect(dbUri: string): Promise<mongoose.Connection> {
    //connect to the database
    try {
        let connection = await mongoose.connect(dbUri, {
            autoIndex: true,
            autoCreate: false,
            bufferCommands: false, // Disable buffering
        });
        await Camera.find();
        await connection.connection.db.command({ "convertToCapped": "Log", size: parseInt(process.env["LOG_COLLECTION_SIZE"] ?? "512") })
        console.log("Mongoose connection established: " + dbUri);
    } catch (error) {
        console.log("Mongoose default connection error: " + dbUri);
        await mongoose.disconnect()
        throw Error(String(error))
    };
    //listen for connection events
    mongoose.connection.on("connected", () => {
        console.log("Mongoose default connection open to " + dbUri);
        mongoose.set('debug', true);
    });
    //listen for connection errors
    mongoose.connection.on("error", (err) => {
        console.log("Mongoose default connection error: " + err);
        process.exit(1);
    });
    return mongoose.connection;
}

//for disconnect from the database on testing
export async function Disconnect() {
    try {
        return await mongoose.disconnect();
    } catch (error) {
        console.log("Mongoose disconnect error: " + error);
        return false;
    };
};

export default connect;
