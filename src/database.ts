import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

console.log(process.env.DB_USER)
const pool=new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(String(process.env.DB_PORT))
})

const connectDB = async () => {
    let client;
    try {
      client = await pool.connect();
      console.log("PostgreSQL is connected");
      client.release();
    } catch (error) {
      console.error(`Error connecting to PostgreSQL:`);
      process.exit(1);
    }
  };
  export { pool, connectDB };





