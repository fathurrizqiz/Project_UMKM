<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5aa64c31-eae4-47fb-9bc0-11fead76cbbd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production data on an Ubuntu VPS

Product and order data is stored in `store.json`. Set `STORE_DATA_DIR` to a
writable directory that is not replaced when deploying the application, for
example `/var/lib/dapur-hangat`. The service user must have write access to
that directory. For a systemd service, configure both a stable
`WorkingDirectory` for the application and `Environment=STORE_DATA_DIR=/var/lib/dapur-hangat`.

The database is initialized with empty products, orders, notifications, and
reviews only when `store.json` does not exist. Back up existing data before
changing `STORE_DATA_DIR`; an existing database is not moved automatically.
