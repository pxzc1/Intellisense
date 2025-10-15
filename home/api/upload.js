const Mega = require('megajs');
const crypto = require('crypto');

// This serverless function expects a JSON body: { filename, mimetype, dataBase64, nickname }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { filename, mimetype, dataBase64, nickname } = req.body;
    if (!filename || !dataBase64) return res.status(400).json({ error: 'missing fields' });

    // init Mega
    if (process.env.USE_MEGA !== '1') return res.status(500).json({ error: 'Mega not enabled' });
    const storage = new Mega.Storage({ email: process.env.MEGA_EMAIL, password: process.env.MEGA_PASSWORD, autoload: true });
    await new Promise((resolve, reject) => storage.on('ready', resolve));

    const sanitize = (n) => n.replace(/\s+/g, '_');
    const sanitized = sanitize(filename);
    const length = sanitized.length;
    const hex = crypto.createHash('sha256').update(sanitized).digest('hex');
    const N = parseInt(process.env.HASH_DIGITS || '9', 10);
    const bigint = BigInt('0x' + hex);
    const hashedNumeric = (bigint % (BigInt(10) ** BigInt(N))).toString().padStart(N, '0');
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const datePart = `${dd}${mm}${yy}`;
    const id = `${length}${hashedNumeric}${datePart}`;
    const storedFilename = `${id}_${sanitized}`;

    const buffer = Buffer.from(dataBase64, 'base64');

    // upload to Mega
    const { Readable } = require('stream');
    const stream = new Readable();
    stream._read = () => {};
    stream.push(buffer);
    stream.push(null);
    const mfile = storage.upload({ name: storedFilename }, stream);
    await new Promise((resolve, reject) => {
      mfile.on('complete', resolve);
      mfile.on('error', reject);
    });
    const link = mfile.link || mfile.publicLink || null;

    // update submissions.json in Mega root (best-effort: download, modify, re-upload)
    const submissionsName = 'submissions.json';
    const existing = await (async () => {
      try {
        const node = storage.root.children.find(c => c.name === submissionsName);
        if (!node) return [];
        const buf = await node.download();
        return JSON.parse(buf.toString());
      } catch (e) { return []; }
    })();
  const metadata = { nickname: nickname || 'anonymous', time: `${dd}/${mm}/${yy} (${now.getHours()}:${now.getMinutes()}:${now.getSeconds()})`, filename: sanitized, url: `/api/uploads/${id}`, length, hashed: Number(hashedNumeric), megaLink: link };
    existing.push(metadata);

    // remove old submissions.json node if exists
    const oldNode = storage.root.children.find(c => c.name === submissionsName);
    if (oldNode && typeof oldNode.remove === 'function') {
      await new Promise((resolve) => oldNode.remove(resolve));
    }
    // upload new submissions.json
    const sstream = new Readable(); sstream._read = () => {}; sstream.push(Buffer.from(JSON.stringify(existing, null, 2))); sstream.push(null);
    await new Promise((resolve, reject) => {
      const n = storage.upload({ name: submissionsName }, sstream);
      n.on('complete', resolve);
      n.on('error', reject);
    });

    res.json({ success: true, metadata, publicUrl: link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal' });
  }
};
