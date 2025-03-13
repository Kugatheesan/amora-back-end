import { Router } from "express";
import { createUser, signinuser, getProfile, logout, forgotPassword, resetPassword, verifyOTP, googleLogin, getAllUsers, deleteUser, signinAdmin } from "../conrollers/userController";
import { auth } from "../utils/auth";

const   router=Router();



router.get('/get', getAllUsers);
router.delete('/get/:id', deleteUser); 
router.post('/register',createUser);
router.post('/login',signinuser);
router.post('/admin', signinAdmin)
router.get('/profile', auth, getProfile)
router.post('/logout', logout)
router.post('/forgot-password',forgotPassword)
router.post('/reset-password',resetPassword)
router.post('/verify-otp',verifyOTP)

router.post('/google-login', googleLogin );

export default router;