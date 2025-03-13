import { Request, Response } from "express";
import {pool} from '../database'
import { promises } from "dns";
// import { native } from "pg";


// getAllCategories

export const getAllCategories = async (req: Request, res: Response)=> {
    try {
        const result = await pool.query("SELECT * FROM categories");

        if (result.rows.length === 0) {
            // Send the response without returning res
            res.status(404).json({ message: "No categories found." });
            return; // Just return here, no need to return res
        }

        // Send the result rows as JSON
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create a new category 
export const createCategory = async (req: Request, res: Response): Promise<any> => {

    try {
        // Start a transaction to ensure data consistency
        const client = await pool.connect();
        await client.query('BEGIN');  // Begin transaction

        // Array to hold results after insertion
        const insertedCategories = [];

        const { name, description, service_id } = req.body;

        // Validate each category input
        if (!name || !service_id) {
            await client.query('ROLLBACK');  // Rollback if validation fails
            return res.status(400).json({ message: "Category name and service_id are required for all categories." });
        }

        // Check if the service_id exists in the services table
        const serviceCheck = await client.query("SELECT id, name FROM services WHERE id = $1", [service_id]);

        if (serviceCheck.rows.length === 0) {
            await client.query('ROLLBACK');  // Rollback if service_id is invalid
            return res.status(400).json({ message: `Service with ID ${service_id} does not exist.` });
        }

        // Insert category into the categories table
        const result = await client.query(
            "INSERT INTO categories (name, description, service_id) VALUES ($1, $2, $3) RETURNING *",
            [name, description, service_id]
        );

        // Add the inserted category to the result array
        insertedCategories.push(result.rows[0]);

        // Commit the transaction after all categories are successfully inserted
        await client.query('COMMIT');
        client.release();

        // Fetch the service details after category insertion
        const service = insertedCategories.length > 0 
            ? insertedCategories[0].service_id 
            : null;

        const serviceDetails = await pool.query(
            "SELECT id, name FROM services WHERE id = $1",
            [service]
        );

        if (serviceDetails.rows.length === 0) {
            return res.status(404).json({ message: `Service with ID ${service} not found.` });
        }

        // Group response with service details and associated categories
        const response = {
            service: serviceDetails.rows[0],
            categories: insertedCategories
        };

        // Return the response with service and categories
        res.status(201).json(response);

    } catch (error) {
        console.error("Error creating categories:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get all services (without filtering)
export const getAllServices = async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT * FROM services");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get services by category (corporate, family, television)
export const getServicesByServiceId = async (req: Request, res: Response): Promise<any> => {
    const { serviceId } = req.params;  // Get serviceId from the URL parameter

    if (!serviceId) {
        return res.status(400).json({ message: "Service ID parameter is required" });
    }

    try {
        // Step 1: Get services by service_id
        const serviceResult = await pool.query("SELECT * FROM services WHERE id = $1", [serviceId]);

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ message: `Service with ID '${serviceId}' not found` });
        }

        // Step 2: Get all categories matching this service_id
        const categoryResult = await pool.query(
            "SELECT * FROM categories WHERE service_id = $1", 
            [serviceId]
        );

        // Step 3: Return the service with all associated categories
        return res.status(200).json({
            service: serviceResult.rows[0], 
            categories: categoryResult.rows // ✅ Return an array of categories
        });

    } catch (error) {
        console.error("Error fetching service by ID:", error);
        return res.status(500).json({ message: "Server error" });
    }
};


// Get a single service by ID
export const getServiceById = async (req: Request, res: Response):Promise<any> => {
    try {
        const { id } = req.params;
        const result = await pool.query("SELECT * FROM services WHERE id = $1", [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Service not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Create a new service (with category)
// Create a new service
export const createService = async (req: Request, res: Response):Promise<any> => {
    try {
        const { name } = req.body;

        // Ensure the name is provided
        if (!name) {
            return res.status(400).json({ message: "Service name is required." });
        }

        const result = await pool.query(
            "INSERT INTO services (name) VALUES ($1) RETURNING *",
            [name]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating service:", error);
        res.status(500).json({ message: "Server error" });
    }
};

//editCaregoty
export const editCategory = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { name, description, service_id } = req.body;

        // Validate input
        if (!id) {
            return res.status(400).json({ message: "Category ID is required." });
        }
        if (!name || !service_id) {
            return res.status(400).json({ message: "Category name and service_id are required." });
        }

        // Check if the category exists
        const categoryCheck = await pool.query("SELECT id FROM categories WHERE id = $1", [id]);
        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({ message: `Category with ID ${id} not found.` });
        }

        // Check if the service_id exists
        const serviceCheck = await pool.query("SELECT id FROM services WHERE id = $1", [service_id]);
        if (serviceCheck.rows.length === 0) {
            return res.status(400).json({ message: `Service with ID ${service_id} does not exist.` });
        }

        // Update category
        const result = await pool.query(
            "UPDATE categories SET name = $1, description = $2, service_id = $3 WHERE id = $4 RETURNING *",
            [name, description, service_id, id]
        );

        // Wrap the result in an array format
        res.status(200).json([result.rows[0]]);
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Server error" });
    }
};


//edit service
export const editService = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        // Validate input
        if (!id) {
            return res.status(400).json({ message: "Service ID is required." });
        }
        if (!name) {
            return res.status(400).json({ message: "Service name is required." });
        }

        // Check if the service exists
        const serviceCheck = await pool.query("SELECT id FROM services WHERE id = $1", [id]);
        if (serviceCheck.rows.length === 0) {
            return res.status(404).json({ message: `Service with ID ${id} not found.` });
        }

        // Update service
        const result = await pool.query(
            "UPDATE services SET name = $1, description = $2 WHERE id = $3 RETURNING *",
            [name, description, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({ message: "Server error" });
    }
};

//delete service
export const deleteService = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        // Validate input
        if (!id) {
            return res.status(400).json({ message: "Service ID is required." });
        }

        // Check if the service exists
        const serviceCheck = await pool.query("SELECT id FROM services WHERE id = $1", [id]);
        if (serviceCheck.rows.length === 0) {
            return res.status(404).json({ message: `Service with ID ${id} not found.` });
        }

        // Delete service
        await pool.query("DELETE FROM services WHERE id = $1", [id]);

        res.status(200).json({ message: "Service deleted successfully." });
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ message: "Server error" });
    }
};
//delete category
export const deleteCategory = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;

        // Validate input
        if (!id) {
            return res.status(400).json({ message: "Category ID is required." });
        }

        // Check if the category exists
        const categoryCheck = await pool.query("SELECT id FROM categories WHERE id = $1", [id]);
        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({ message: `Category with ID ${id} not found.` });
        }

        // Delete category
        await pool.query("DELETE FROM categories WHERE id = $1", [id]);

        res.status(200).json({ message: "Category deleted successfully." });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// export const uploadImage = async(req:Request,res:Response) => {

// }

//add service
export const addService = async (req: Request, res: Response): Promise<any> => {
    const { name } = req.body; // No need for id

    try {
        const result = await pool.query(
            "INSERT INTO services (name) VALUES ($1) RETURNING *",
            [name]
        );

        return res.status(201).json({ message: "Service added successfully", service: result.rows[0] });
    } catch (error) {
        console.error("Error adding service:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

//addcategory
export const addCategory = async (req: Request, res: Response): Promise<any> => {
    const { service_id, name, description } = req.body; // No need for id

    console.log("Received Data:", req.body);

    try {
        const result = await pool.query(
            "INSERT INTO categories (service_id, name, description) VALUES ($1, $2, $3) RETURNING *",
            [service_id, name, description]
        );

        return res.status(201).json({ message: "Category added successfully", category: result.rows[0] });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
