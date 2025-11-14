import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.PG_CONN || "postgresql://localhost:5432/movieapp";

const pool = new Pool({ connectionString });

export default pool;
