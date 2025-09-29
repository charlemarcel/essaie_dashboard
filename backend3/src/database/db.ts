import { Pool, QueryResult } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configuration de la connexion à la base de données
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

/**
 * Exécute une requête SQL et retourne le résultat.
 * @param text La requête SQL sous forme de chaîne de caractères.
 * @param params Les paramètres de la requête.
 * @returns Le résultat de la requête.
 */
export const query = (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};