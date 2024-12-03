const mineflayer = require('mineflayer');
const { Authflow } = require('prismarine-auth');
const readline = require('readline');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors()); // Erlaubt Cross-Origin-Anfragen
app.use(bodyParser.json());

let bot;
let chatMessages = []; // Speicher für die Chat-Nachrichten

function createBot() {
  const authflow = new Authflow('MinecraftBot', './auth_cache'); // Authflow für Microsoft Login

  bot = mineflayer.createBot({
    host: 'opsucht.net',       // Server-Adresse
    port: 25565,               // Server-Port (Standard ist 25565)
    username: 'private@christian-palasch.de', // Deine E-Mail-Adresse
    auth: 'microsoft',         // Authentifizierungsanbieter
    profilesFolder: './auth_cache', // Ordner für Cache-Dateien
    version: '1.20.1',         // Minecraft-Version (aktualisiere entsprechend)
    authflow,
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let commandExecuted = false;

  bot.on('login', () => {
    console.log(`Information: Angemeldet als ${bot.username}`);

    setTimeout(() => {
      if (!commandExecuted) {
        console.log('Information: Führe Command "/nav cb1" aus...');
        bot.chat('/nav cb1');
        commandExecuted = true;
      }
    }, 5000);
  });

  function parseMessage(jsonMsg) {
    if (jsonMsg.text) {
      return jsonMsg.text.trim();
    }
    if (jsonMsg.extra) {
      return jsonMsg.extra
        .map((part) => {
          if (part.text) return part.text.trim();
          if (part.extra) return part.extra.map((subPart) => subPart.text || '').join('');
          return '';
        })
        .join('');
    }
    return JSON.stringify(jsonMsg);
  }

  bot.on('message', (jsonMsg) => {
    const message = parseMessage(jsonMsg);
    if (message) {
      const timestamp = new Date()
        .toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
      chatMessages.push(`${timestamp} | ${message}`);
      console.log(`Nachricht gespeichert: ${timestamp} | ${message}`);
    } else {
      console.warn('Unerwartetes Nachrichtenformat:', JSON.stringify(jsonMsg));
    }
  });

  bot.on('spawn', () => {
    console.log('Information: Der Bot ist dem Server beigetreten.');
  });

  bot.on('kicked', (reason) => {
    console.log(`Information Gekickt: ${reason}`);
  });

  bot.on('error', (err) => {
    if (err.message.includes('PartialReadError') || err.message.includes('Chunk size')) {
      console.warn('Information: Protokollfehler ignoriert:', err.message);
      return;
    }
    console.error('Fehler:', err);
  });

  bot.on('resourcePack', () => {
    console.log('Information: Ressourcenpaket wird akzeptiert...');
    bot.acceptResourcePack();
  });

  // LuckPerms /parent info API-Endpoint
  app.post('/api/luckperms', (req, res) => {
    const { user } = req.body;

    if (!user) {
      return res.status(400).json({ error: 'Benutzername fehlt!' });
    }

    const command = `/lp user ${user} parent info`;
    bot.chat(command);

    let responseMessages = [];
    const messageHandler = (jsonMsg) => {
      const message = parseMessage(jsonMsg);

      // Erkennung der LuckPerms-Antwort
      if (message.startsWith('>')) {
        responseMessages.push(message.replace('>', '').trim());
      }

      if (responseMessages.length > 0 && responseMessages.length >= 10) {
        bot.removeListener('message', messageHandler);
        return res.json({ user, groups: responseMessages });
      }
    };

    bot.on('message', messageHandler);

    // Timeout erhöhen und sicherstellen, dass die Antwort entfernt wird
    setTimeout(() => {
      bot.removeListener('message', messageHandler);
      if (responseMessages.length === 0) {
        return res.status(504).json({ error: 'Keine Antwort vom Server erhalten.' });
      }
    }, 10000); // Timeout auf 10 Sekunden erhöht
  });
}

app.get('/api/messages', (req, res) => {
  if (chatMessages.length === 0) {
    return res.json([]);
  }

  res.json(chatMessages);
});

app.listen(port, () => {
  console.log(`API läuft unter http://localhost:${port}`);
});

createBot();