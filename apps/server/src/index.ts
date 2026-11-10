import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import { ensureDataDirs, serverConfig, ROOT_DIR } from "./config.js";
import { apiRouter } from "./routes.js";

ensureDataDirs();

const app = express();
app.use(
  cors({
    origin: [serverConfig.webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use("/api", apiRouter);

const webDist = path.join(ROOT_DIR, "apps/web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.listen(serverConfig.port, serverConfig.host, () => {
  console.log(
    `[wob-server] http://${serverConfig.host}:${serverConfig.port}  (API /api)`,
  );
});
