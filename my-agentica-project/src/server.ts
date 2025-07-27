import express, { Request, Response, NextFunction } from "express";
import { PublicDataService } from "./services/PublicDataService";

const app = express();
const port = process.env.PORT || 3001;

const publicDataService = new PublicDataService();

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.post("/api/ai/query-plan", async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required",
      code: "MISSING_PROMPT",
    });
  }

  try {
    const result = await publicDataService.createQueryPlan({ prompt });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error creating query plan:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Agentica AI Service running on http://localhost:${port}`);
});

export default app;