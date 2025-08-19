// src/mcp/httpBridge.ts
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Very small proxy bridge:
 * - If body.ns === "supabase", forward to SUPABASE_MCP_BRIDGE_URL
 * - Else, forward to MCP_BRIDGE_URL (playwright)
 */
const PW = process.env.MCP_BRIDGE_URL;
const SP = process.env.SUPABASE_MCP_BRIDGE_URL;
if (!PW) console.warn("MCP_BRIDGE_URL is not set (playwright).");
if (!SP) console.warn("SUPABASE_MCP_BRIDGE_URL is not set (supabase).");

app.post("/call", async (req, res) => {
  try {
    const { ns, tool, args } = req.body ?? {};
    const dest = ns === "supabase" ? SP : PW;
    if (!dest) return res.status(500).json({ error: "No target MCP endpoint configured" });

    const r = await fetch(dest, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool, args, ...(ns ? { ns } : {}) }),
    });
    const txt = await r.text();
    res.status(r.status).send(txt);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const PORT = Number(process.env.MIN_BRIDGE_PORT || 4319);
app.listen(PORT, () => {
  console.log(`Minimal MCP proxy bridge on http://localhost:${PORT}/call`);
});
