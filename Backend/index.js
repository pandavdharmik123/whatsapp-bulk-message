import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
import qrcode from 'qrcode-terminal';
import axios from 'axios';
import http from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import whatsapp from 'whatsapp-web.js'; // ✅ FIXED CommonJS import
const { Client, LocalAuth, MessageMedia } = whatsapp;

import { overlayGujaratiText } from './editPDF.js'; // ✅ keep this ESM

dotenv.config();

/* ----------- Path Setup for ES modules ----------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ----------- Configuration ----------- */
const PORT = process.env.PORT || 3000;
const API_TOKEN = process.env.API_TOKEN || 'changeme';
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '8000', 10);
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '14000', 10);
const RETRIES = parseInt(process.env.RETRIES || '2', 10);
const HEADLESS = (process.env.HEADLESS || 'true').toLowerCase() === 'true';
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const JOBS_FILE = process.env.JOBS_FILE || './jobs.json';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ----------- Multer setup ----------- */
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage });

/* ----------- Express + Socket.io setup ----------- */
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

/* ----------- Auth Middleware ----------- */
function authMiddleware(req, res, next) {
  const token = req.headers['x-api-key'] || req.headers['authorization'];
  if (!token || token !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/* ----------- Job Management ----------- */
function loadJobs() {
  try {
    if (!fs.existsSync(JOBS_FILE)) {
      fs.writeFileSync(JOBS_FILE, JSON.stringify({}), 'utf8');
    }
    return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to load jobs file', e);
    return {};
  }
}
function saveJobs(jobs) {
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf8');
}
let jobs = loadJobs();

/* ----------- WhatsApp Client ----------- */
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', (qr) => {
  console.log('Scan this QR:');
  qrcode.generate(qr, { small: true });
});
client.on('ready', () => console.log('✅ WhatsApp client ready'));
client.on('auth_failure', (msg) => console.error('Auth failure:', msg));
client.on('disconnected', (reason) => console.log('❌ WhatsApp disconnected:', reason));

client.initialize();

/* ----------- Utilities ----------- */
function randDelay() {
  return MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
}
function toChatId(phone) {
  return `91${phone}@c.us`;
}
async function mediaFromUrl(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  const b = Buffer.from(res.data, 'binary').toString('base64');
  const ct = res.headers['content-type'] || 'image/jpeg';
  return new MessageMedia(ct, b);
}

async function sendMediaTo(chatId, mediaRef, caption = '') {
  let lastErr = null;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      if (!mediaRef) return await client.sendMessage(chatId, caption || ' ');
      if (typeof mediaRef === 'string') {
        if (mediaRef.startsWith('http')) {
          const mm = await mediaFromUrl(mediaRef);
          return await client.sendMessage(chatId, mm, { caption });
        } else {
          const fullPath = path.resolve(mediaRef);
          const mm = MessageMedia.fromFilePath(fullPath);
          return await client.sendMessage(chatId, mm, { caption });
        }
      } else if (mediaRef instanceof MessageMedia) {
        return await client.sendMessage(chatId, mediaRef, { caption });
      } else {
        return await client.sendMessage(chatId, caption || ' ');
      }
    } catch (err) {
      lastErr = err;
      console.warn(`send attempt ${attempt + 1} failed for ${chatId}:`, err.message);
      await new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 3000)));
    }
  }
  throw lastErr;
}

/* ----------- Job Processor ----------- */
let processing = false;
async function processJobs() {
  if (processing) return;
  processing = true;
  try {
    const jobIds = Object.keys(jobs).filter((j) => jobs[j].status === 'queued');
    for (const jobId of jobIds) {
      const job = jobs[jobId];
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      job.results = job.results || [];
      saveJobs(jobs);
      io.emit(`job:${jobId}`, { type: 'started', jobId, total: job.items.length });

      for (let i = 0; i < job.items.length; i++) {
        const it = job.items[i];
        const phone = String(it.phone || '').replace(/\D/g, '');
        const caption = it.message || '';
        const mediaRef = it.mediaPath || it.mediaUrl || null;

        if (!phone) {
          job.results.push({ phone: it.phone, status: 'error', error: 'Invalid phone' });
          io.emit(`job:${jobId}`, { type: 'item', jobId, index: i, status: 'error', phone });
          continue;
        }

        const chatId = toChatId(phone);
        try {
          if (!client.info || !client.info.wid) throw new Error('WA client not ready');

          let fileToSend = mediaRef;
          if (mediaRef && mediaRef.endsWith('.pdf')) {
            try {
              const nameForPdf = it.name || caption || phone;
              const personalizedPath = path.join(UPLOAD_DIR, `personalized_${phone}.pdf`);
              fileToSend = await overlayGujaratiText(
                'Simat Vidhi Pandav Parivar.pdf',
                nameForPdf,
                caption,
                2,
                UPLOAD_DIR,
              );
            } catch (e) {
              console.error(`Failed to personalize PDF for ${phone}`, e);
              fileToSend = mediaRef;
            }
          }

          await sendMediaTo(chatId, fileToSend, '');
          job.results.push({ phone, status: 'sent', index: i });
          io.emit(`job:${jobId}`, { type: 'item', jobId, index: i, status: 'sent', phone });
        } catch (err) {
          console.error(`Error sending to ${phone}:`, err.message);
          job.results.push({ phone, status: 'failed', error: err.message });
          io.emit(`job:${jobId}`, { type: 'item', jobId, index: i, status: 'failed', phone });
        }

        const d = randDelay();
        io.emit(`job:${jobId}`, { type: 'delay', jobId, ms: d });
        await new Promise((r) => setTimeout(r, d));
      }

      job.status = 'finished';
      job.finishedAt = new Date().toISOString();
      saveJobs(jobs);
      io.emit(`job:${jobId}`, { type: 'finished', jobId, results: job.results });
    }
  } catch (e) {
    console.error('processJobs error', e);
  } finally {
    processing = false;
  }
}
setInterval(processJobs, 2000);

/* ----------- API Routes ----------- */
app.post('/send-bulk', authMiddleware, upload.array('files', 500), async (req, res) => {
  try {
    let items = [];
    if (req.is('multipart/form-data')) {
      if (!req.body.items) return res.status(400).json({ error: 'items field missing' });
      items = JSON.parse(req.body.items);
      if (req.files && req.files.length) {
        const fileMap = {};
        for (const f of req.files) {
          fileMap[f.originalname] = path.join(UPLOAD_DIR, f.filename);
        }
        for (const it of items) {
          if (it.fileName && fileMap[it.fileName]) it.mediaPath = fileMap[it.fileName];
          if (it.fileIndex !== undefined && req.files[it.fileIndex])
            it.mediaPath = path.join(UPLOAD_DIR, req.files[it.fileIndex].filename);
        }
      }
    } else {
      items = req.body.items || [];
    }

    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items to send' });

    const jobId = uuidv4();
    jobs[jobId] = {
      id: jobId,
      jobName: req.body.jobName || null,
      status: 'queued',
      createdAt: new Date().toISOString(),
      items,
      results: [],
    };
    saveJobs(jobs);

    io.emit(`job:${jobId}`, { type: 'queued', jobId, total: items.length });
    setImmediate(processJobs);

    res.json({ jobId, status: 'queued', pollUrl: `/job/${jobId}`, wsEvent: `job:${jobId}` });
  } catch (err) {
    console.error('send-bulk error', err);
    res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

app.get('/job/:jobId', authMiddleware, (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

app.get('/jobs', authMiddleware, (_, res) => res.json(Object.values(jobs)));

app.get('/status', authMiddleware, (_, res) => {
  const ready = !!(client.info && client.info.wid);
  res.json({ ready, clientInfo: ready ? client.info : null });
});

/* ----------- Socket.io ----------- */
io.on('connection', (socket) => {
  console.log('🔌 Socket connected', socket.id);
  socket.on('subscribe', (jobId) => {
    socket.join(jobId);
    console.log(`Socket ${socket.id} subscribed to ${jobId}`);
    if (jobs[jobId]) socket.emit(`job:${jobId}`, { type: 'sync', job: jobs[jobId] });
  });
  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

/* ----------- Start Server ----------- */
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('📁 Uploads folder:', path.resolve(UPLOAD_DIR));
});
