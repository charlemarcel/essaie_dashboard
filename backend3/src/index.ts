import express, { Express } from "express";
import routes from "./routes/routes";
import cors from 'cors';

const app: Express = express();
const port: number = 3000;

app.use(cors());
app.use(express.json());



// Ligne pour que l'application Express utilise les routes
app.use("/api", routes);
console.log("Router chargé sur /api");
app.listen(port, () => {
  console.log(`Le serveur écoute sur http://localhost:${port}`);
});
