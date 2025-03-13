import { Router } from "express";
import { getAllBookings, createBooking, getBookingById ,editBooking ,deleteBooking} from "../conrollers/bookingController";
import { Adminauth, auth } from "../utils/auth";

const router = Router();

router.get('/get', Adminauth, getAllBookings);
router.post('/create', auth, createBooking);
router.get('/bookings',Adminauth, getBookingById);
router.put('/editbooking',Adminauth,editBooking);
router.delete('/delete/:id',Adminauth,deleteBooking);



export default router;
