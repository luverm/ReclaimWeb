const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const {
  initializeDatabase,
  publicUser,
  createUser,
  getUserByEmail,
  verifyUser,
  createSession,
  deleteSession,
  getUserBySessionToken,
  updateUserSettings
} = require("./db");
const { parseUploadedDocument } = require("./documents");
const { generateSummary, generatePresentation } = require("./ai");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const PORT = Number(process.env.PORT || 8787);
const distDir = path.join(process.cwd(), "dist");

function authToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function createCorsOptions() {
  const rawOrigins = String(process.env.CORS_ORIGIN || "").trim();
  if (!rawOrigins) {
    return true;
  }

  const allowedOrigins = rawOrigins
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS."));
    }
  };
}

async function requireUser(req, res, next) {
  try {
    const token = authToken(req);
    const user = await getUserBySessionToken(token);
    if (!user) {
      return res.status(401).json({ ok: false, message: "Unauthorized." });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    next(error);
  }
}

function createApp() {
  const app = express();

  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: "10mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const fullName = String(req.body.fullName || "").trim();
      const company = String(req.body.company || "").trim();
      const email = String(req.body.email || "").trim().toLowerCase();
      const password = String(req.body.password || "");

      if (fullName.length < 2 || company.length < 2 || !email.includes("@") || password.length < 8) {
        return res.status(400).json({ ok: false, message: "Fill in all fields with valid values." });
      }
      if (await getUserByEmail(email)) {
        return res.status(400).json({ ok: false, message: "An account with that email already exists." });
      }

      const user = await createUser({ fullName, company, email, password });
      const token = await createSession(user.id);
      res.json({ ok: true, token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const user = await verifyUser(
        String(req.body.email || "").trim().toLowerCase(),
        String(req.body.password || "")
      );
      if (!user) {
        return res.status(401).json({ ok: false, message: "Incorrect email or password." });
      }
      const token = await createSession(user.id);
      res.json({ ok: true, token, user: publicUser(user) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/session", requireUser, (req, res) => {
    res.json({ ok: true, user: publicUser(req.user) });
  });

  app.post("/api/auth/logout", requireUser, async (req, res, next) => {
    try {
      await deleteSession(req.token);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/settings", requireUser, (req, res) => {
    res.json({ ok: true, user: publicUser(req.user) });
  });

  app.post("/api/settings", requireUser, async (req, res, next) => {
    try {
      const updated = await updateUserSettings(req.user.id, req.body);
      res.json({ ok: true, user: publicUser(updated) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/upload", requireUser, upload.single("document"), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, message: "No file uploaded." });
      }
      const document = await parseUploadedDocument(req.file);
      res.json({ ok: true, document });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/summarize", requireUser, async (req, res, next) => {
    try {
      const summary = await generateSummary({
        provider: req.user.ai_provider,
        openaiApiKey: req.user.openai_api_key,
        anthropicApiKey: req.user.anthropic_api_key,
        model: req.user.preferred_model,
        audience: req.body.audience,
        length: req.body.length,
        documentText: req.body.documentText,
        fileName: req.body.fileName,
        brand: publicUser(req.user).brand
      });
      res.json({ ok: true, summary });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/presentation", requireUser, async (req, res, next) => {
    try {
      const presentation = await generatePresentation({
        provider: req.user.ai_provider,
        openaiApiKey: req.user.openai_api_key,
        anthropicApiKey: req.user.anthropic_api_key,
        model: req.user.preferred_model,
        brief: req.body.brief,
        slideCount: req.body.slideCount || 6,
        brand: publicUser(req.user).brand
      });
      res.json({ ok: true, presentation });
    } catch (error) {
      next(error);
    }
  });

  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.use((error, _req, res, _next) => {
    console.error(error);
    const message = error.message || "Unexpected server error.";
    res.status(500).json({ ok: false, message });
  });

  return app;
}

async function startServer() {
  await initializeDatabase();
  const app = createApp();
  return app.listen(PORT, () => {
    console.log(`Reclaim API listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start Reclaim server");
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  startServer
};
