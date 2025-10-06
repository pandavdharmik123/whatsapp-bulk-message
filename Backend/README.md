# WA Bulk Sender (advanced)

## Features
- Uses whatsapp-web.js LocalAuth to persist session (scan QR once).
- /send-bulk creates a job and returns jobId immediately.
- Background worker processes jobs and sends media or text.
- Supports uploaded files (multipart form-data) or remote media URLs.
- Job progress emitted via socket.io events named `job:<jobId>`.
- Jobs persisted to `jobs.json`.

## Quick start
1. Copy `.env.example` to `.env` and set `API_TOKEN` and other values.
2. npm install
3. npm start
4. On first run scan the QR code printed in the console using WhatsApp → Linked devices → Link a device.
5. Use the API:
    - POST /send-bulk (x-api-key header). For JSON body send:
      {
      "jobName": "MyJob",
      "items": [
      { "phone": "911234567890", "mediaUrl": "https://example.com/pic.jpg", "caption": "Hi" },
      { "phone": "919876543210", "caption": "Hello text only" }
      ]
      }
    - For file uploads, send multipart/form-data with `items` field containing JSON array and files in `files` field. Example below.

6. Connect socket.io client to receive updates. Listen for event `job:<jobId>`.

## Notes
- Keep API_TOKEN secret.
- Use HTTPS & proper auth for production.
- Respect WhatsApp terms & throttle sends.
