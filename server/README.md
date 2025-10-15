# Intellisense Upload Server

This is a small Node/Express server that accepts image uploads, computes an ID from the filename using SHA256-derived numeric hashing, stores files in Google Cloud Storage (GCS) if configured, and maintains a `submissions.json` metadata file.

Features
- POST /upload - accepts multipart/form-data with `file` and optional `nickname`.
- GET /submissions - returns array of metadata objects.
- GET /uploads/:id - serves or redirects to uploaded file.
- DELETE /delete/:filename - deletes file and metadata entry.

Configuration (environment variables)
- GCLOUD_BUCKET - (optional) GCS bucket name. If set, server will upload files to this bucket and store `uploads/submissions.json` there.
- HASH_DIGITS - (optional) number of digits to use for numeric hash (default 9).
- PORT - (optional) server listen port (default 4000).

Mega configuration (optional)
- USE_MEGA - set to `1` to enable Mega uploads.
- MEGA_EMAIL - your Mega account email (or provide session token instead).
- MEGA_PASSWORD - your Mega account password.

When `USE_MEGA=1` the server will upload files to your Mega account, create a share link, and store `megaLink` and `megaId` in the submission metadata. The `/uploads/:id` endpoint will redirect to the Mega share link when present.

If `GCLOUD_BUCKET` is not provided, the server saves files locally under `server/uploads/` and stores `submissions.json` there.

Running locally

1. Install dependencies:

```bash
cd server
npm install
```

2. Start server:

```bash
npm start
```

3. Use the front-end to upload or call the endpoints directly.

Notes about deployment
- For Vercel serverless functions, you can re-implement the endpoints as serverless functions under `home/api/` but you'll still need a GCS bucket for persistent storage.
- Provide GCS credentials via your hosting platform env vars or service account configuration.
