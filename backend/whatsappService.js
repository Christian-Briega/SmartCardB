const path = require('path');
const fs = require('fs');
const dns = require('dns').promises;
const QRCode = require('qrcode');

const AUTH_DIR = path.join(__dirname, '.wa_auth');

let sock = null;
let waStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected' | 'network_blocked'
let qrCodeDataUrl = null;
let connectedPhone = null;
let lastError = null;
let isInitializing = false;
let consecutiveTimeouts = 0;

async function isWhatsAppWebBlockedByNetwork() {
  try {
    const res = await dns.lookup('web.whatsapp.com');
    return res.address === '127.0.0.1' || res.address === '0.0.0.0' || res.address === '::1';
  } catch {
    return false;
  }
}

async function initWhatsAppClient() {
  if (
    isInitializing ||
    waStatus === 'network_blocked' ||
    (sock && (waStatus === 'connected' || waStatus === 'qr_ready'))
  ) {
    return getWhatsAppStatus();
  }

  if (await isWhatsAppWebBlockedByNetwork()) {
    waStatus = 'network_blocked';
    lastError =
      'O domínio web.whatsapp.com está bloqueado nesta rede local (127.0.0.1). Utilize as chaves de API (CallMeBot, Twilio, Z-API ou Meta Cloud API) no arquivo .env para envio real.';
    return getWhatsAppStatus();
  }

  isInitializing = true;
  waStatus = 'connecting';
  lastError = null;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket =
      baileys.makeWASocket ||
      (typeof baileys.default === 'function' ? baileys.default : baileys.default?.default);
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
    const pino = (await import('pino')).default;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    let version = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest?.version) {
        version = latest.version;
      }
    } catch {
      // Usa versão fallback
    }

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['SmartCard BUS', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        consecutiveTimeouts = 0;
        waStatus = 'qr_ready';
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr, {
            margin: 2,
            width: 280,
          });
        } catch (err) {
          console.warn('[WhatsApp Baileys] Erro ao gerar imagem QR:', err.message);
        }
      }

      if (connection === 'open') {
        consecutiveTimeouts = 0;
        waStatus = 'connected';
        qrCodeDataUrl = null;
        lastError = null;
        const userJid = sock?.user?.id || '';
        connectedPhone = userJid.split(':')[0].split('@')[0] || 'Conectado';
        console.log(`[WhatsApp Baileys] Conectado com sucesso ao número: +${connectedPhone}`);
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.data?.statusCode ||
          0;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        sock = null;
        qrCodeDataUrl = null;
        connectedPhone = null;

        if (statusCode === 408) {
          consecutiveTimeouts += 1;
          if (consecutiveTimeouts >= 2) {
            waStatus = 'network_blocked';
            lastError =
              'Conexão direta ao WhatsApp Web bloqueada pela rede atual. Usando API REST configurada em .env.';
            return;
          }
        }

        waStatus = 'disconnected';

        if (statusCode === DisconnectReason.loggedOut) {
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {
            // Ignora erro
          }
        } else if (shouldReconnect && consecutiveTimeouts < 2) {
          setTimeout(() => {
            initWhatsAppClient().catch(() => {});
          }, 3000);
        }
      }
    });
  } catch (err) {
    lastError = err.message;
    waStatus = 'disconnected';
  } finally {
    isInitializing = false;
  }

  return getWhatsAppStatus();
}

function getWhatsAppStatus() {
  return {
    status: waStatus,
    connected: waStatus === 'connected',
    qrCodeDataUrl,
    connectedPhone,
    lastError,
  };
}

async function requestWhatsAppPairingCode(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const waPhone = digits.startsWith('55') ? digits : `55${digits}`;

  if (!sock) {
    await initWhatsAppClient();
  }

  if (!sock || typeof sock.requestPairingCode !== 'function') {
    throw new Error('Cliente WhatsApp indisponível nesta rede.');
  }

  return sock.requestPairingCode(waPhone);
}

async function sendRealWhatsAppMessage(phoneDigits, text) {
  if (!sock || waStatus !== 'connected') {
    await initWhatsAppClient();
    if (!sock || waStatus !== 'connected') {
      return {
        sent: false,
        reason: waStatus === 'network_blocked' ? 'network_blocked' : 'not_connected',
        status: getWhatsAppStatus(),
      };
    }
  }

  const cleanDigits = String(phoneDigits || '').replace(/\D/g, '');
  const national =
    cleanDigits.startsWith('55') && cleanDigits.length >= 12
      ? cleanDigits.slice(2)
      : cleanDigits;

  const ddd = national.slice(0, 2);
  const rest = national.slice(2);

  const candidateNumbers = new Set();
  candidateNumbers.add(`55${national}`);
  if (rest.length === 9 && rest.startsWith('9')) {
    candidateNumbers.add(`55${ddd}${rest.slice(1)}`);
  } else if (rest.length === 8) {
    candidateNumbers.add(`55${ddd}9${rest}`);
  }

  let targetJid = `55${national}@s.whatsapp.net`;

  try {
    for (const candidate of candidateNumbers) {
      const checkResult = await sock.onWhatsApp(candidate);
      if (Array.isArray(checkResult) && checkResult.length > 0 && checkResult[0].exists) {
        targetJid = checkResult[0].jid;
        break;
      }
    }
  } catch {
    // Fallback JID
  }

  await sock.sendMessage(targetJid, { text });
  console.log(`[WhatsApp Baileys] Mensagem real entregue para ${targetJid}`);

  return {
    sent: true,
    jid: targetJid,
  };
}

module.exports = {
  initWhatsAppClient,
  getWhatsAppStatus,
  requestWhatsAppPairingCode,
  sendRealWhatsAppMessage,
};
