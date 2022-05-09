import mongoose from "mongoose";

// Connect to the database
function connect() {
    //find the url to connect to the database
    const dbUri = process.env["MONGODB_URL"] as string;
    
    //connect to the database
    return mongoose
        .connect(dbUri)
        .then(() => {
            console.info("Database connected");
            mongoose.set('debug', true);
        })
        .catch((error) => {
            console.error("db error", error);
            process.exit(1);
        });
}

export default connect;