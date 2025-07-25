import express from "express";
import aiRoutes from "./routes/aiRoutes";
import "dotenv/config";

const app = express();
const port = 3001;

app.use(express.json());

app.use("/api/ai", aiRoutes);

app.listen(port, () => {
  console.log(`AI service listening at http://localhost:${port}`);
});
