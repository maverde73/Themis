import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./utils/config";
import { errorHandler } from "./middleware/errorHandler";
import routes from "./routes";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: "1mb" }));

app.use("/api/v1", routes);

app.use(errorHandler);

export default app;
