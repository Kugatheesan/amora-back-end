import express from "express";
import { getAllServices, getServicesByServiceId, getServiceById, createService, createCategory, getAllCategories, editCategory, editService, deleteService, deleteCategory,  } from "../conrollers/serviceController";
import { Adminauth } from "../utils/auth";


const routers = express.Router();

routers.post("/addcategory",Adminauth, createCategory)  // change to array multiple add
routers.get("/",Adminauth, getAllServices); // Get all services
routers.get("/categories",Adminauth, getAllCategories);
routers.get("/:id",Adminauth, getServiceById);
routers.get("/service/:serviceId",Adminauth, getServicesByServiceId); // Get services by category ID
routers.post("/create",Adminauth, createService)

routers.put("/catedit/:id",Adminauth, editCategory )  // change to arry
routers.put("/seredit",Adminauth, editService)
routers.delete("/serdelete/:id",Adminauth, deleteService)
routers.delete("/catdelete/:id",Adminauth,deleteCategory)


export default routers;
