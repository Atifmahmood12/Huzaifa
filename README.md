# Huzaifa — Personal Hub

This repository hosts a small static personal hub for "Huzaifa" (Gaming Bricks). It's a lightweight static HTML/CSS/JS site that is driven from `categories.json` and can optionally use the YouTube Data API to fetch live channel thumbnails and metadata.

Quick preview
1. Run a static server from the repo root:

```bash
cd /Volumes/Development/Huzaifa-projects/Huzaifa
python3 -m http.server 8000
# then open http://localhost:8000
```

Key files
- `index.html` — site root (Huzaifa personal hub)
- `sites/huzaifa/index.html` — per-site page for Huzaifa
- `assets/js/site.js` — client script: reads `categories.json`, renders category items and channel banner; includes optional YouTube Data API integration
- `categories.json` — list of sites and content categories
- `assets/config.example.json` — example runtime config (create `assets/config.json` with your API key if you want automatic channel metadata)

YouTube Data API (optional)

The site can fetch channel thumbnail/title/playlist information from the YouTube Data API so the header/profile image and the channel banner show real thumbnails.

To enable this:
1. Create an API key in Google Cloud Console and enable **YouTube Data API v3**.
2. Copy the example config and add your key locally (do NOT commit the real key):

```bash
cp assets/config.example.json assets/config.json
# then edit assets/config.json and set ytApiKey
```

assets/config.json contents:
```json
{
	"ytApiKey": "YOUR_KEY_HERE"
}
```

When present, the site client will try to resolve the configured default channel (currently `SITE_CONFIG.defaultChannelUrl`) and update the header avatar and channel banner using the fetched thumbnail.

Security note
- The API key (if placed into `assets/config.json`) will be fetched by the browser at runtime. If you prefer not to expose the key publicly, create a small server-side proxy or function that stores the key and fetches channel data on the server instead.

Rename note
- `HarisAtif.html` has been left as a small redirect page pointing to `huzaifaatif.html` (the renamed copy). If you'd rather fully delete the old file, tell me and I will remove it.

Deploy
- The repository can be published to GitHub Pages. If you already have a workflow (see `.github/workflows/deploy.yml`) it may publish a chosen `sites/<site-name>` folder; update that `site_path` to `sites/huzaifa` if you want the Huzaifa folder published.

Next steps I can take for you
- Replace the header image by downloading and saving the thumbnail into `assets/img/profile.jpg` (requires a server-side script or manual save).
- Add a GitHub Actions step to automatically publish `sites/huzaifa` to GitHub Pages.
- Implement a small server-side proxy to keep the YouTube API key secret.

Editing & deploying each site (quick)
- Edit site files inside `sites/<site>/` (e.g. `sites/huzaifa/` or `sites/haris/`).
- Put site-specific assets under `sites/<site>/assets/`; keep shared files in `assets/`.
- Configure `sites/<site>/config.json` (set `siteName`, `title`, `channelUrl`, `avatar`). `siteName` becomes the published folder name (e.g. `Haris`, `Huzaifa`).
- Build locally:
	- `npm run build` or `bash scripts/build_sites.sh` (creates `out/`)
	- Preview: `python3 -m http.server 8000` from repo root and open `http://localhost:8000/<SiteName>/`.
- Publish flow:
	- Commit your changes on `main` (or open a feature branch + PR): `git add -A && git commit -m "msg" && git push origin main`.
	- The GitHub Actions workflow will run `scripts/build_sites.sh` and publish `out/` to the `gh-pages` branch.
- URLs after publish: `https://<owner>.github.io/<repo>/Haris/` and `https://<owner>.github.io/<repo>/Huzaifa/` (configured via `siteName`).

If you'd like me to do any of the above now, tell me which and I'll proceed.
