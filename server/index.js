const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mime = require('mime-types');

const { Storage } = require('@google-cloud/storage');
const Mega = require('megajs');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Configurable N digits for numeric hash
const HASH_DIGITS = parseInt(process.env.HASH_DIGITS || '9', 10);

let useGCS = false;
let useMega = false;
let megaStorage = null;
let storage, bucket;
if (process.env.GCLOUD_BUCKET) {
  try {
    storage = new Storage();
    bucket = storage.bucket(process.env.GCLOUD_BUCKET);
    useGCS = true;
    console.log('Using GCS bucket:', process.env.GCLOUD_BUCKET);
  } catch (err) {
    console.error('GCS init failed, falling back to local storage', err);
  }
}

// Initialize Mega if requested
if (process.env.USE_MEGA === '1') {
  try {
    megaStorage = new Mega.Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD,
      autoload: true
    });
    megaStorage.on('ready', () => {
      useMega = true;
      console.log('Mega ready');
    });
    megaStorage.on('error', (e) => console.error('Mega error', e));
    console.log('Initialized Mega (auth in progress)');
  } catch (err) {
    console.error('Mega init failed', err);
  }
}

const upload = multer({ storage: multer.memoryStorage() });

function sanitizeFilename(name) {
  return name.replace(/\s+/g, '_');
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function numericFromSha256(hex, digits) {
  const bigint = BigInt('0x' + hex);
  const mod = BigInt(10) ** BigInt(digits);
  const val = bigint % mod;
  return val.toString().padStart(digits, '0');
}

function formatTime(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yy} (${hh}:${min}:${ss})`;
}

const SUBMISSIONS_KEY = 'uploads/submissions.json';

async function readSubmissions() {
  if (useGCS) {
    try {
      const file = bucket.file(SUBMISSIONS_KEY);
      const [exists] = await file.exists();
      if (!exists) return [];
      const [contents] = await file.download();
      return JSON.parse(contents.toString());
    } catch (err) {
      console.error('readSubmissions GCS error', err);
      return [];
    }
  } else {
    const localPath = path.join(UPLOADS_DIR, 'submissions.json');
    if (!fs.existsSync(localPath)) return [];
    try {
      const raw = fs.readFileSync(localPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('readSubmissions local error', err);
      return [];
    }
  }
}

async function writeSubmissions(data) {
  if (useGCS) {
    try {
      const file = bucket.file(SUBMISSIONS_KEY);
      await file.save(JSON.stringify(data, null, 2), { contentType: 'application/json' });
      return true;
    } catch (err) {
      console.error('writeSubmissions GCS error', err);
      return false;
    }
  } else {
    const localPath = path.join(UPLOADS_DIR, 'submissions.json');
    try {
      fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('writeSubmissions local error', err);
      return false;
    }
  }
}

app.get('/submissions', async (req, res) => {
  const subs = await readSubmissions();
  // return as array
  res.json(subs || []);
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const nickname = req.body.nickname ? String(req.body.nickname) : 'anonymous';
    if (!req.file) return res.status(400).json({ error: 'no file provided' });

    const originalName = req.file.originalname || 'file';
    const ext = path.extname(originalName).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowed.includes(ext)) return res.status(400).json({ error: 'invalid file extension' });

    const sanitized = sanitizeFilename(originalName);
    const length = sanitized.length;
    const hex = sha256Hex(sanitized);
    const hashedNumeric = numericFromSha256(hex, HASH_DIGITS);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePart = `${dd}${mm}${yy}`;
    const id = `${length}${hashedNumeric}${datePart}`;
    const storedFilename = `${id}_${sanitized}`;

    // save to GCS, Mega, or local
    let publicUrl = '';
    let megaLink = null;
    let megaId = null;
    if (useGCS) {
      const file = bucket.file(`uploads/${storedFilename}`);
      await file.save(req.file.buffer, { resumable: false, metadata: { contentType: req.file.mimetype } });
      publicUrl = `https://storage.googleapis.com/${process.env.GCLOUD_BUCKET}/uploads/${encodeURIComponent(storedFilename)}`;
    } else if (useMega && megaStorage) {
      // upload to Mega: create a readable stream from the buffer
      const { Readable } = require('stream');
      const stream = new Readable();
      stream._read = () => {};
      stream.push(req.file.buffer);
      stream.push(null);

      const mfile = megaStorage.upload({ name: storedFilename }, stream);
      // wait for completion (best-effort using events)
      await new Promise((resolve, reject) => {
        mfile.on('complete', () => resolve());
        mfile.on('error', (e) => reject(e));
      }).catch(err => {
        console.error('Mega upload error', err);
      });
      // attempt to read public link / handle
      megaLink = (mfile && (mfile.link || mfile.publicLink || mfile.exportLink || mfile.sharelink)) || null;
      megaId = (mfile && (mfile.h || mfile.node || mfile.nodeId || mfile.handle)) || null;
      publicUrl = megaLink || ('/uploads/' + encodeURIComponent(storedFilename));
    } else {
      const outPath = path.join(UPLOADS_DIR, storedFilename);
      fs.writeFileSync(outPath, req.file.buffer);
      publicUrl = `/uploads/${encodeURIComponent(storedFilename)}`;
    }

    const metadata = {
      nickname,
      time: formatTime(now),
      filename: sanitized,
      url: `/uploads/${id}`,
      length,
      hashed: Number(hashedNumeric),
      megaLink: megaLink,
      megaId: megaId
    };

    // append to submissions (as array)
    const subs = await readSubmissions();
    subs.push(metadata);
    await writeSubmissions(subs);

    res.json({ success: true, metadata, publicUrl });
  } catch (err) {
    console.error('upload error', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// serve uploads when local
app.get('/uploads/:filename', async (req, res) => {
  const name = req.params.filename;
  // try to find a submission with this id
  const subs = await readSubmissions();
  const sub = (subs || []).find(s => s.url === `/uploads/${name}` || s.filename === name);
  if (sub) {
    if (sub.megaLink) return res.redirect(sub.megaLink);
    // if GCS public URL exists and GCLOUD_BUCKET configured
    if (useGCS) {
      return res.redirect(`https://storage.googleapis.com/${process.env.GCLOUD_BUCKET}/uploads/${encodeURIComponent(name)}`);
    }
    // local file lookup
    const files = fs.readdirSync(UPLOADS_DIR);
    const found = files.find(f => f.startsWith(name + '_') || f === name || f.endsWith('_' + name));
    if (!found) return res.status(404).send('Not found');
    const p = path.join(UPLOADS_DIR, found);
    const type = mime.lookup(p) || 'application/octet-stream';
    res.setHeader('Content-Type', type);
    return fs.createReadStream(p).pipe(res);
  }
  // fallback behavior: if using GCS redirect to bucket path; if using Mega and no sub found try direct
  if (useGCS) return res.redirect(`https://storage.googleapis.com/${process.env.GCLOUD_BUCKET}/uploads/${encodeURIComponent(name)}`);
  return res.status(404).send('Not found');
});

app.delete('/delete/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    if (useGCS) {
      await bucket.file(`uploads/${filename}`).delete().catch(() => {});
      // remove from submissions
      let subs = await readSubmissions();
      subs = subs.filter(s => s.filename !== filename);
      await writeSubmissions(subs);
      return res.json({ status: 'success' });
    } else if (useMega && megaStorage) {
      // find submission by filename
      let subs = await readSubmissions();
      const target = subs.find(s => s.filename === filename);
      if (target && target.megaId) {
        try {
          // megajs does not provide a direct delete method on stored references here in all cases
          // best-effort: locate node and call remove
          const node = megaStorage.get(target.megaId);
          if (node && typeof node.remove === 'function') {
            await new Promise((resolve, reject) => node.remove((err) => err ? reject(err) : resolve()));
          }
        } catch (err) {
          console.error('Mega delete error', err);
        }
      }
      subs = subs.filter(s => s.filename !== filename);
      await writeSubmissions(subs);
      return res.json({ status: 'success' });
    } else {
      const files = fs.readdirSync(UPLOADS_DIR);
      const found = files.find(f => f === filename || f.endsWith('_' + filename));
      if (found) fs.unlinkSync(path.join(UPLOADS_DIR, found));
      let subs = await readSubmissions();
      subs = subs.filter(s => s.filename !== filename);
      await writeSubmissions(subs);
      return res.json({ status: 'success' });
    }
  } catch (err) {
    console.error('delete error', err);
    res.status(500).json({ status: 'error' });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
