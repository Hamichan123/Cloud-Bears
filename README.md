# Cloud Bears · Waitlist Site

A professional waitlist application for the Cloud Bears NFT collection.

## What's in the box

```
cloudbears/
├── index.html      ← Landing page (hero, gallery, roadmap, CTA)
├── apply.html      ← Application page with 4 sequential locked tasks
├── Code.gs         ← Google Apps Script — writes submissions to a Google Sheet
└── assets/         ← Bear character images
```

## The four tasks (in order, each required, each locks the next)

| # | Task                       | What gets captured            |
|---|----------------------------|-------------------------------|
| 1 | Follow @CloudBears_NFT     | X handle (validated)          |
| 2 | Like + Retweet the tweet   | Confirmation flag             |
| 3 | Comment on the tweet       | Direct link to the comment    |
| 4 | Drop wallet address        | EVM (0x…) or Solana address   |

Until task N is verified, task N+1 stays locked (greyed out, no inputs).
After all four are green, the **Submit** button at the bottom activates.

## Connecting the form to Google Sheets

1. Open [Google Sheets](https://sheets.google.com) → create a new spreadsheet (name it whatever you like).
2. In that spreadsheet, go to **Extensions → Apps Script**.
3. Delete the default code, paste in the contents of `Code.gs`, save.
4. Click **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the **Web app URL** Google gives you.
6. Open `apply.html`, find this line near the top of the `<script>` block:
   ```js
   const APPS_SCRIPT_URL = '';
   ```
   Paste your Web app URL between the quotes. Save.
7. Submit a test application — a row appears in the **Applications** tab of your sheet.

## What the sheet captures (auto-created headers)

`Timestamp · Ticket ID · X Handle · Liked + Retweeted · Comment Link · Wallet Address · User Agent · IP · Status`

Status defaults to **Pending Review** — you can change values in the sheet directly (Approved / Rejected / etc.) to track your review queue.

## Optional toggles (in `Code.gs`)

- `ENABLE_EMAIL_NOTIFICATION` → get an email for each new application
- `PREVENT_DUPLICATE_WALLETS` → reject submissions reusing a wallet
- `PREVENT_DUPLICATE_HANDLES` → reject submissions reusing an X handle

## Local preview

Just open `index.html` in your browser — everything is static (no build step). Both `index.html` and `apply.html` work as standalone files.

## Hosting

Drop the whole `cloudbears/` folder onto Netlify, Vercel, GitHub Pages, Cloudflare Pages, or any static host. No server is needed — the only backend is the Apps Script + Sheet.
