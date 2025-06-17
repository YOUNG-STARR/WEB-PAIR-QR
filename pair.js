const express = require('express');
const fs = require('fs-extra');
const { exec } = require("child_process");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const { upload } = require('./mega');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const router = express.Router();

const MESSAGE = process.env.MESSAGE || `
*✅ SESSION GENERATED SUCCESSFULLY*

📌 *Gɪᴠᴇ ᴀ ꜱᴛᴀʀ →* https://github.com/GuhailTechInfo/ULTRA-MD
💬 *Support:* https://t.me/GlobalBotInc
📺 *YT:* https://youtube.com/GlobalTechInfo
`;

function generateRandomID(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return [...Array(length)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Nettoyage initial
if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync('./auth_info_baileys');
}

router.get('/', async (req, res) => {
  let number = req.query.number;
  if (!number) return res.send({ error: "Missing number parameter ?number=..." });

  const { state, saveCreds } = await useMultiFileAuthState(`./auth_info_baileys`);

  try {
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Safari"),
    });

    if (!sock.authState.creds.registered) {
      await delay(1500);
      number = number.replace(/[^0-9]/g, '');
      const pairingCode = await sock.requestPairingCode(number);

      if (!res.headersSent) res.send({ pairingCode });

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on("connection.update", async ({ connection }) => {
        if (connection === "open") {
          await delay(5000);
          const path = './auth_info_baileys/creds.json';
          if (!fs.existsSync(path)) return;

          const megaUrl = await upload(fs.createReadStream(path), `${generateRandomID(8)}.json`);
          const sessionId = megaUrl.replace("https://mega.nz/file/", "");

          const jid = sock.user.id;
          const msg = await sock.sendMessage(jid, { text: sessionId });
          await sock.sendMessage(jid, { text: MESSAGE }, { quoted: msg });

          await delay(1500);
          fs.emptyDirSync('./auth_info_baileys');
        }
      });
    }
  } catch (err) {
    console.error("Error:", err);
    await fs.emptyDirSync('./auth_info_baileys');
    if (!res.headersSent) res.send({ error: "Internal error. Try later." });
  }
});

module.exports = router;
