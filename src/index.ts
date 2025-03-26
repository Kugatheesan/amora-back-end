import express from "express";
import cors from "cors";
import router from "./router/userRouter";
import serviceRouter from "./router/serviceRouter";
import bookingRouter from "./router/bookingRouter";
import { connectDB } from "./database";
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser';
import googleAuthRoutes from './auth'

import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS Configuration
app.use(cors({
    origin: ["http://localhost:5173","http://localhost:5174", String(process.env.FE_URL), String(process.env.ADMIN_URL)], 
    credentials: true,
}));

app.use(cookieParser());

// Middleware to parse JSON
app.use(express.json());
app.use(bodyParser.json()); // (optional) Extra JSON parsin

// Use API routes
app.use("/api/users", router);
app.use("/api/services", serviceRouter);
app.use("/api/bookings",bookingRouter)
app.use("/auth", googleAuthRoutes); //  Add Google Auth Route
 
// Start the server
app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

connectDB();