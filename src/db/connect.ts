import mongoose from "mongoose";

// Connect to the database 
async function connect() {
    //find the url to connect to the database
    const dbUri = process.env["MONGODB_URL"] as string;

    //connect to the database
    mongoose.connect(dbUri, { authSource: 'admin' });
    //listen for connection events
    await mongoose.connection.on("connected", () => {
        console.log("Mongoose default connection open to " + dbUri);
        mongoose.set('debug', true);
    });
    //listen for connection errors
    await mongoose.connection.on("error", (err) => {
        console.log("Mongoose default connection error: " + err);
        process.exit(1);
    });

    return mongoose.connection;
}

//for disconnect from the database on testing
export function Disconnect() {
    return mongoose.disconnect();
};

export default connect;
