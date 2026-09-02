var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws = require("ws");
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "ciphergram_db.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var db = {
  users: {},
  conversations: {},
  messages: {},
  scheduledMessages: []
};
function loadDb() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
      db = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error loading db file:", err);
  }
}
function saveDb() {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving db file:", err);
  }
}
loadDb();
function seedInitialData() {
  if (Object.keys(db.users).length === 0) {
    const demoUser1 = {
      id: "usr_cipher_alice",
      username: "alice_sec",
      displayName: "Alice (Security)",
      avatarColor: "from-emerald-500 to-teal-600",
      bio: "E2EE enthusiast | Keys verified \u{1F512}",
      twoFactorEnabled: false,
      createdAt: Date.now() - 864e5 * 5,
      lastSeen: Date.now(),
      passwordHash: "demo123"
    };
    const demoUser2 = {
      id: "usr_cipher_bob",
      username: "bob_dev",
      displayName: "Bob (OpenSource)",
      avatarColor: "from-indigo-500 to-cyan-600",
      bio: "Self-hosting everything \u{1F680}",
      twoFactorEnabled: false,
      createdAt: Date.now() - 864e5 * 3,
      lastSeen: Date.now(),
      passwordHash: "demo123"
    };
    db.users[demoUser1.id] = demoUser1;
    db.users[demoUser2.id] = demoUser2;
    saveDb();
  }
}
seedInitialData();
var server = import_http.default.createServer(app);
var wss = new import_ws.WebSocketServer({ server });
var connectedClients = /* @__PURE__ */ new Map();
wss.on("connection", (ws) => {
  let authenticatedUserId = null;
  ws.on("message", (messageRaw) => {
    try {
      const payload = JSON.parse(messageRaw.toString());
      const { type, data } = payload;
      if (type === "auth:connect") {
        const { userId } = data;
        authenticatedUserId = userId;
        connectedClients.set(userId, ws);
        if (db.users[userId]) {
          db.users[userId].lastSeen = Date.now();
        }
        broadcastToAll({
          type: "user:presence",
          data: { userId, isOnline: true, lastSeen: Date.now() }
        });
      } else if (type === "user:typing") {
        const { conversationId, isTyping } = data;
        const conv = db.conversations[conversationId];
        if (conv && authenticatedUserId) {
          conv.participants.forEach((pId) => {
            if (pId !== authenticatedUserId) {
              sendToUser(pId, {
                type: "user:typing",
                data: { conversationId, userId: authenticatedUserId, isTyping }
              });
            }
          });
        }
      } else if (type === "message:status_update") {
        const { messageId, conversationId, status } = data;
        const msgs = db.messages[conversationId] || [];
        const targetMsg = msgs.find((m) => m.id === messageId);
        if (targetMsg) {
          targetMsg.status = status;
          saveDb();
          sendToUser(targetMsg.senderId, {
            type: "message:status_update",
            data: { messageId, conversationId, status }
          });
        }
      }
    } catch (err) {
      console.error("WS message parse error:", err);
    }
  });
  ws.on("close", () => {
    if (authenticatedUserId) {
      connectedClients.delete(authenticatedUserId);
      if (db.users[authenticatedUserId]) {
        db.users[authenticatedUserId].lastSeen = Date.now();
        saveDb();
      }
      broadcastToAll({
        type: "user:presence",
        data: {
          userId: authenticatedUserId,
          isOnline: false,
          lastSeen: Date.now()
        }
      });
    }
  });
});
function sendToUser(userId, payload) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === import_ws.WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
function broadcastToAll(payload) {
  const json = JSON.stringify(payload);
  connectedClients.forEach((ws) => {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(json);
    }
  });
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "CipherGram E2EE Messenger",
    activeSockets: connectedClients.size,
    totalUsers: Object.keys(db.users).length,
    zeroCostSelfHosted: true
  });
});
app.post("/api/auth/register", (req, res) => {
  const { username, displayName, password, publicKeyJwk, bio } = req.body;
  if (!username || !displayName || !password) {
    return res.status(400).json({ error: "Username, display name, and password are required." });
  }
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: "Username ID must be at least 3 characters (letters, numbers, underscore)." });
  }
  const existing = Object.values(db.users).find((u) => u.username === cleanUsername);
  if (existing) {
    return res.status(400).json({ error: "Username handle is already taken. Please choose another ID." });
  }
  const userId = `usr_${Math.random().toString(36).substring(2, 10)}`;
  const avatarColors = [
    "from-emerald-500 to-teal-600",
    "from-indigo-500 to-cyan-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-sky-600"
  ];
  const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  const newUser = {
    id: userId,
    username: cleanUsername,
    displayName,
    avatarColor,
    bio: bio || "CipherGram private encrypted user",
    publicKeyJwk: publicKeyJwk || null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    backupCodes: [],
    passwordHash: password,
    // In production, bcrypt hash; simple password comparison for portable storage
    createdAt: Date.now(),
    lastSeen: Date.now()
  };
  db.users[userId] = newUser;
  saveDb();
  res.json({
    user: {
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      avatarColor: newUser.avatarColor,
      bio: newUser.bio,
      publicKeyJwk: newUser.publicKeyJwk,
      twoFactorEnabled: newUser.twoFactorEnabled,
      createdAt: newUser.createdAt
    },
    token: `token_${userId}_${Date.now()}`
  });
});
app.post("/api/auth/login", (req, res) => {
  const { username, password, totpToken } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const user = Object.values(db.users).find(
    (u) => u.username === cleanUsername || u.id === username
  );
  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: "Invalid username or password." });
  }
  if (user.twoFactorEnabled) {
    if (!totpToken) {
      return res.json({
        needsTwoFactor: true,
        tempUserId: user.id,
        message: "Two-Factor Authentication token required"
      });
    }
    const isBackupCode = user.backupCodes && user.backupCodes.includes(totpToken.trim().toUpperCase());
    if (isBackupCode) {
      user.backupCodes = user.backupCodes.filter((c) => c !== totpToken.trim().toUpperCase());
      saveDb();
    }
  }
  user.lastSeen = Date.now();
  saveDb();
  res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
      bio: user.bio,
      publicKeyJwk: user.publicKeyJwk,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt
    },
    token: `token_${user.id}_${Date.now()}`
  });
});
app.post("/api/auth/2fa/update", (req, res) => {
  const { userId, enabled, secret, backupCodes } = req.body;
  const user = db.users[userId];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  user.twoFactorEnabled = !!enabled;
  if (enabled) {
    user.twoFactorSecret = secret;
    user.backupCodes = backupCodes || [];
  } else {
    user.twoFactorSecret = null;
    user.backupCodes = [];
  }
  saveDb();
  res.json({ success: true, twoFactorEnabled: user.twoFactorEnabled, backupCodes: user.backupCodes });
});
app.post("/api/users/public-key", (req, res) => {
  const { userId, publicKeyJwk } = req.body;
  const user = db.users[userId];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  user.publicKeyJwk = publicKeyJwk;
  saveDb();
  res.json({ success: true });
});
app.get("/api/users/search", (req, res) => {
  const query = (req.query.q || "").toLowerCase().trim();
  const currentUserId = req.query.currentUserId;
  const results = Object.values(db.users).filter((u) => {
    if (currentUserId && u.id === currentUserId) return false;
    if (!query) return true;
    return u.username.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query) || u.id.toLowerCase().includes(query);
  }).map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarColor: u.avatarColor,
    bio: u.bio,
    publicKeyJwk: u.publicKeyJwk,
    isOnline: connectedClients.has(u.id),
    lastSeen: u.lastSeen
  }));
  res.json(results);
});
app.get("/api/users/:id", (req, res) => {
  const user = db.users[req.params.id];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    bio: user.bio,
    publicKeyJwk: user.publicKeyJwk,
    isOnline: connectedClients.has(user.id),
    lastSeen: user.lastSeen
  });
});
app.post("/api/conversations", (req, res) => {
  const { type, name, description, participants, creatorId, disappearingTimer, groupKeyMap } = req.body;
  if (!participants || participants.length === 0) {
    return res.status(400).json({ error: "Participants are required" });
  }
  const allParticipants = Array.from(/* @__PURE__ */ new Set([creatorId, ...participants]));
  if (type === "direct" && allParticipants.length === 2) {
    const existing = Object.values(db.conversations).find((c) => {
      return c.type === "direct" && c.participants.length === 2 && c.participants.includes(allParticipants[0]) && c.participants.includes(allParticipants[1]);
    });
    if (existing) {
      return res.json(existing);
    }
  }
  const conversationId = `conv_${Math.random().toString(36).substring(2, 11)}`;
  const colors = [
    "from-emerald-500 to-teal-600",
    "from-indigo-500 to-cyan-600",
    "from-purple-500 to-pink-600",
    "from-amber-500 to-rose-600"
  ];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const conversation = {
    id: conversationId,
    type: type || "direct",
    name: name || (type === "direct" ? "Private Chat" : "Secure Group"),
    description: description || "",
    avatarColor,
    participants: allParticipants,
    adminIds: [creatorId],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    disappearingTimer: disappearingTimer || 0,
    groupKeyMap: groupKeyMap || {}
  };
  db.conversations[conversationId] = conversation;
  db.messages[conversationId] = [];
  saveDb();
  allParticipants.forEach((pId) => {
    sendToUser(pId, {
      type: "conversation:new",
      data: conversation
    });
  });
  res.json(conversation);
});
app.get("/api/conversations", (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  const userConversations = Object.values(db.conversations).filter((c) => c.participants.includes(userId)).map((c) => {
    const msgs = db.messages[c.id] || [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    let displayName = c.name;
    let avatarColor = c.avatarColor;
    let otherUserOnline = false;
    if (c.type === "direct") {
      const otherId = c.participants.find((p) => p !== userId);
      const otherUser = otherId ? db.users[otherId] : null;
      if (otherUser) {
        displayName = otherUser.displayName;
        avatarColor = otherUser.avatarColor;
        otherUserOnline = connectedClients.has(otherId);
      }
    }
    return {
      ...c,
      name: displayName,
      avatarColor,
      isOtherUserOnline: otherUserOnline,
      lastMessage: lastMsg ? {
        text: lastMsg.isEncrypted ? "\u{1F512} Encrypted message" : lastMsg.decryptedContent,
        senderId: lastMsg.senderId,
        senderDisplayName: lastMsg.senderDisplayName,
        timestamp: lastMsg.timestamp,
        status: lastMsg.status
      } : null
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(userConversations);
});
app.patch("/api/conversations/:id", (req, res) => {
  const { id } = req.params;
  const { disappearingTimer, name, description, participants, groupKeyMap } = req.body;
  const conv = db.conversations[id];
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found" });
  }
  if (disappearingTimer !== void 0) conv.disappearingTimer = disappearingTimer;
  if (name) conv.name = name;
  if (description !== void 0) conv.description = description;
  if (participants) conv.participants = participants;
  if (groupKeyMap) conv.groupKeyMap = { ...conv.groupKeyMap, ...groupKeyMap };
  conv.updatedAt = Date.now();
  saveDb();
  conv.participants.forEach((pId) => {
    sendToUser(pId, {
      type: "conversation:updated",
      data: conv
    });
  });
  res.json(conv);
});
app.get("/api/conversations/:id/messages", (req, res) => {
  const { id } = req.params;
  const msgs = db.messages[id] || [];
  const now = Date.now();
  const activeMsgs = msgs.filter((m) => !m.disappearsAt || m.disappearsAt > now);
  if (activeMsgs.length !== msgs.length) {
    db.messages[id] = activeMsgs;
    saveDb();
  }
  res.json(activeMsgs);
});
app.post("/api/messages/send", (req, res) => {
  const {
    id,
    conversationId,
    senderId,
    senderUsername,
    senderDisplayName,
    ciphertext,
    iv,
    salt,
    isEncrypted,
    type,
    fileData,
    replyTo,
    disappearingDuration
  } = req.body;
  const conv = db.conversations[conversationId];
  if (!conv) {
    return res.status(404).json({ error: "Conversation not found" });
  }
  const messageId = id || `msg_${Math.random().toString(36).substring(2, 11)}`;
  const duration = disappearingDuration || conv.disappearingTimer || 0;
  const disappearsAt = duration > 0 ? Date.now() + duration * 1e3 : void 0;
  const newMsg = {
    id: messageId,
    conversationId,
    senderId,
    senderUsername,
    senderDisplayName,
    ciphertext,
    iv,
    salt,
    isEncrypted: isEncrypted ?? true,
    type: type || "text",
    fileData,
    replyTo,
    timestamp: Date.now(),
    status: "sent",
    disappearsAt,
    disappearingDuration: duration
  };
  if (!db.messages[conversationId]) {
    db.messages[conversationId] = [];
  }
  db.messages[conversationId].push(newMsg);
  conv.updatedAt = Date.now();
  saveDb();
  conv.participants.forEach((pId) => {
    if (pId !== senderId) {
      const isRecipientOnline = connectedClients.has(pId);
      if (isRecipientOnline) {
        newMsg.status = "delivered";
      }
      sendToUser(pId, {
        type: "message:new",
        data: newMsg
      });
    }
  });
  res.json(newMsg);
});
app.post("/api/messages/schedule", (req, res) => {
  const messageData = req.body;
  if (!messageData.scheduledFor || messageData.scheduledFor <= Date.now()) {
    return res.status(400).json({ error: "Scheduled time must be in the future." });
  }
  const scheduleId = `sched_${Math.random().toString(36).substring(2, 11)}`;
  const scheduledItem = {
    ...messageData,
    id: scheduleId,
    status: "scheduled",
    createdAt: Date.now()
  };
  db.scheduledMessages.push(scheduledItem);
  saveDb();
  res.json(scheduledItem);
});
app.get("/api/messages/scheduled", (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }
  const userScheduled = db.scheduledMessages.filter((m) => m.senderId === userId);
  res.json(userScheduled);
});
app.delete("/api/messages/schedule/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = db.scheduledMessages.length;
  db.scheduledMessages = db.scheduledMessages.filter((m) => m.id !== id);
  saveDb();
  res.json({ success: true, deleted: initialLength !== db.scheduledMessages.length });
});
app.post("/api/upload", (req, res) => {
  const { fileName, fileType, fileData, size } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "File data missing" });
  }
  res.json({
    success: true,
    file: {
      name: fileName || "attachment",
      mimeType: fileType || "application/octet-stream",
      size: size || 0,
      dataUrl: fileData
    }
  });
});
setInterval(() => {
  const now = Date.now();
  const due = db.scheduledMessages.filter((m) => m.scheduledFor && m.scheduledFor <= now);
  if (due.length > 0) {
    db.scheduledMessages = db.scheduledMessages.filter((m) => !m.scheduledFor || m.scheduledFor > now);
    due.forEach((scheduledMsg) => {
      const conv = db.conversations[scheduledMsg.conversationId];
      if (conv) {
        const releasedMsg = {
          ...scheduledMsg,
          id: `msg_${Math.random().toString(36).substring(2, 11)}`,
          status: "sent",
          timestamp: now,
          scheduledFor: void 0
        };
        if (!db.messages[scheduledMsg.conversationId]) {
          db.messages[scheduledMsg.conversationId] = [];
        }
        db.messages[scheduledMsg.conversationId].push(releasedMsg);
        conv.updatedAt = now;
        conv.participants.forEach((pId) => {
          sendToUser(pId, {
            type: "message:new",
            data: releasedMsg
          });
        });
      }
    });
    saveDb();
  }
  let messagesPurged = false;
  Object.keys(db.messages).forEach((convId) => {
    const list = db.messages[convId];
    const remaining = list.filter((m) => !m.disappearsAt || m.disappearsAt > now);
    if (remaining.length !== list.length) {
      db.messages[convId] = remaining;
      messagesPurged = true;
    }
  });
  if (messagesPurged) {
    saveDb();
  }
}, 3e3);
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`CipherGram E2EE server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
