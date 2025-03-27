import { Request, Response } from "express";
import { getUser, getUsersInfo, saveUser, userEmailExists, userNameExists, getUserProfile, getUserByEmail, updateOTP, getUserByOTP, updatePassword } from "../repository/userRepository";
import { comparePasswords, hashPassword } from "../utils/utils";
import { CustomRequest, generateToken } from "../utils/auth";
import { sendEmail } from "../utils/mailer";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { promises } from "readline";
import { pool } from "../database";
import jwt  from "jsonwebtoken";

import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//Function to create a new use
export async function createUser(req: Request, res: Response) {
    const { username, email, password ,role} = req.body;

    //check user name exists
    const isuserNameExists = await userNameExists(username);

    //if user name exists return 400
    if (isuserNameExists) {
        res.status(400).send("name already exists");
        return;
    }

    //check  email exists
    const isuserEmailExists = await userEmailExists(email);

    //if  email exists return 400
    if (isuserEmailExists) {
        res.status(400).send("email already exists")
        return;
    }

    //hash password
    const hashedPassword = await hashPassword(password)

    //save user to database
    console.log(username, email, password)
    const savedUser = await saveUser(username, email, hashedPassword,role);
    res.status(201).send(savedUser)
}

//User Interface
interface User {
    role: any;
    user_id: number;
    username: string;
    email: string;
    password: string;
}

//login page

export async function signinuser(req: Request, res: Response) {
    const { username: resUsername, password } = req.body;

    //get user from database
    const user: User = await getUser(resUsername);


    //if user not found return 400
    if (!user) {
        res.status(400).send("User not Found");
        return;
    }

    //compare passwor
    const isPasswordCorrect = await comparePasswords(password, user.password);

    //if password is not correct return 400
    if (!isPasswordCorrect) {
        res.status(400).send("Password is incorrect");
        return;
    }

    //if password is correct return token
    const token = generateToken(user);
    const { user_id, username, email } = user;

    // Set token in HTTP-only cookie for better security
    res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true,  // Keep false for local testing
        sameSite: "none", // Change to "None" in production
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(200).send({ user: { user_id, username, email,token } });
}
// admin login
export async function signinAdmin(req: any, res: any) {
    const { username: resUsername, password } = req.body;

    console.log("Received username:", resUsername);
    console.log("Received password:", password); // Debugging log

    if (!resUsername || !password) {
        return res.status(400).send("Username and password are required.");
    }

    // Get user from database
    const user: User = await getUser(resUsername);

    console.log("Fetched user:", user); // Debugging log

    // If user not found return 400
    if (!user) {
        return res.status(400).send("User not Found");
    }

    // Ensure user.password is available before comparing
    if (!user.password) {
        return res.status(500).send("Error: User password is missing in the database.");
    }

    // Compare password
    const isPasswordCorrect = await comparePasswords(password, user.password);

    // If password is incorrect return 400
    if (!isPasswordCorrect) {
        return res.status(400).send("Password is incorrect");
    }

    // Check if the user is an admin
    if (!user.role || user.role !== "admin") {
        return res.status(403).send("Unauthorized: You are not an admin.");
    }

    // Generate admin token
    const { user_id, username, email, role } = user;
    const token = generateToken({ user_id, username, email, role });

    // Set token in HTTP-only cookie
    res.cookie("admin_auth_token", token, {
        httpOnly: true,
        secure: true,  // Keep false for local testing, change to true in production
        sameSite: "none", // Change to "None" in production
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Send response
    res.status(200).send({ admin: { user_id, username, email, role , token} });
}



// Function to get user details
export async function getUsers(req: Request, res: Response) {
    const users = await getUsersInfo();
    res.status(200).send(users.rows);
}

export async function getProfile(req: Request, res: Response) {
    const user_name = (req as CustomRequest).token.name;
    const userInfo = await getUserProfile(user_name)
    res.status(200).send(userInfo)
}

export const logout = async (req: Request, res: Response) => {
    try {
        res.cookie('auth_token', null, {
            expires: new Date(Date.now()),
            httpOnly: true
        })
        res.status(200).send({ message: 'logout Success' })

    } catch (error) {
        res.status(500).send({ message: 'logout failed' })
    }
}

export async function forgotPassword(req: Request, res: Response): Promise<any> {
    const { email } = req.body;

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
        return res.status(400).send("User not found");
    }

    // Generate reset token and expiry time (1 hour)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Save token in database
    await updateOTP(user.id, otp, otpExpiry);

    // Store token in HTTP-only cookie
    res.cookie("reset_token", otp, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Use HTTPS in production
        sameSite: "lax",
        expires: otpExpiry, //  FIXED: Pass Date object
    });

    // Send email with reset link
    const resetLink = otp;
    await sendEmail(email, "Password Reset", `Click here to reset your password: ${resetLink}`); //otp sent to email

    res.status(200).send("Password reset link sent to your email");
}

export async function verifyOTP(req: Request, res: Response): Promise<any> {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).send("OTP is required");
    }

    // Get user by OTP
    const user = await getUserByOTP(otp);
    console.log("User::", user)
    if (!user || user.otp_expiry < new Date()) {
        return res.status(400).send("Invalid or expired OTP");
    }

    res.status(200).send("OTP verified successfully");
}


export async function resetPassword(req: Request, res: Response): Promise<any> {
    const { otp, newPassword } = req.body;

    // Get user by token
    const user = await getUserByOTP(otp);
    console.log(user);
    if (!user || user.reset_token_expiry < Date.now()) {
        return res.status(400).send("Invalid or expired OTP");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await updatePassword(user.id, hashedPassword);

    // Clear OTP after verification
    await updateOTP(user.id, user.token, user.expiry);

    res.status(200).send("Password reset successful");
}

    // google
    export async function googleLogin(req: any, res: any) {
        try {
            const { token } = req.body;
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            if (!payload) {
                return res.status(400).json({ message: "Invalid Google token" });
            }
            console.log("Google User Info:", payload);

            const userResult = await pool.query(
                `SELECT * FROM public."users" WHERE email = $1`, [payload.email]
            );
            let user;
            if (userResult.rows.length === 0) {
                // Insert new user into PostgreSQL
                const insertQuery = `
            INSERT INTO public."users" (username, email, profileImage, role)
            VALUES ($1, $2, $3, $4) RETURNING *`;
                const insertResult = await pool.query(insertQuery, [
                    payload.name, payload.email, payload.picture, "user"
                ]);
                user = insertResult.rows[0];
            } else {
                user = userResult.rows[0];
            }
            // Generate JWT
            const authToken = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET || "default_secret",
                { expiresIn: "1d" }
            );
            res.json({ token: authToken, user });
        } catch (error) {
            console.error("Google Authentication Error:", error);
            res.status(401).json({ message: "Google Authentication Failed" });
        }
    }




//get user
export const getAllUsers = async (req: Request, res: Response):Promise<any> => {
    try {
        const result = await pool.query("SELECT id, username, email FROM users ORDER BY id DESC");
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No users found." });
        }

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
 
//delete user
export const deleteUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        // Check if user exists
        const userCheck = await pool.query("SELECT * FROM users WHERE id = $1", [id]);

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: "User not found." });
        }

        // Delete user from database
        await pool.query("DELETE FROM users WHERE id = $1", [id]);

        return res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ message: "Server error" });
    }
};