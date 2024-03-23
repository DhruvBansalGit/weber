import mongoose from "mongoose";

let isConnected = false;

export const connectToDB = async () => {
  mongoose.set("strictQuery", true);
  if (!process.env.MONGODB_URI)
    console.log("MONGODB connection url is not defined");
  if (isConnected) return console.log("=> using the defined connection");

  try {
    await mongoose.connect(
      String(process.env.MONGODB_URI).replace(
        "<Password>",
        String(process.env.MONGODB_PASSWORD)
      )
    );
    isConnected = true;
    console.log("Connection Successful...");
  } catch (error) {
    console.log(error);
  }
};
