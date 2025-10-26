import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
app.use(express.json());

// === CONFIG ===
const GITHUB_TOKEN = "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"; // 🔹 Put your GitHub token here
const REPO_OWNER = "ellee1337";
const REPO_NAME = "ElleSteamTools";
const FILE_PATH = "users.json";

// Helper: MD5 hash
const createMD5 = (text) =>
  crypto.createHash("md5").update(text).digest("hex");

// === ROUTE: REGISTER ===
app.post("/register", async (req, res) => {
  const { username, password, code } = req.body;
  if (!username || !password || !code)
    return res.status(400).json({ error: "Missing username, password, or code" });

  try {
    // Get users.json from GitHub
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FILE_PATH}`;
    const response = await fetch(rawUrl);
    const data = await response.json();

    // Check if code is valid
    if (!data.codes.includes(code))
      return res.status(403).json({ error: "Invalid or used code" });

    // Check if username already exists
    if (data.users.some((u) => u.username === username))
      return res.status(409).json({ error: "Username already taken" });

    // Add new user
    const hashed = createMD5(password);
    data.users.push({ username, password: hashed });

    // Remove used code and add new one
    data.codes = data.codes.filter((c) => c !== code);
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    data.codes.push(newCode);

    // Get current file SHA for GitHub commit
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const fileRes = await fetch(apiUrl, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    const fileData = await fileRes.json();

    // Update file on GitHub
    const update = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Auto-register new user: ${username}`,
        content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
        sha: fileData.sha,
      }),
    });

    if (!update.ok) throw new Error("Failed to update GitHub file.");

    res.json({
      success: true,
      message: `✅ Registered successfully! New code generated: ${newCode}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// === RUN SERVER ===
app.listen(3000, () => console.log("🚀 Registration API running on port 3000"));
