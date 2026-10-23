# House of Amrut website

Plain HTML, CSS and JavaScript. No framework, no build step.

## Files
- `index.html`, `the-house.html`, `experiences.html`, `tasting-room.html`, `library.html`, `contact.html`: the six pages
- `assets/styles.css`: all styling (colours and fonts are at the top)
- `assets/main.js`: menu, tabs, library search and bottle details, candle effect, reservation form
- `vercel.json`: serves clean URLs (`/library` instead of `/library.html`) and sets the security headers
- `.vercelignore`: keeps `apps-script/` and this README off the public site

## Security headers
`vercel.json` sends a Content-Security-Policy that only allows the outside services the site uses:
Google Fonts, Cloudinary (images, video, menu PDF), the Google Maps embed and the Apps Script URL.
If you add a new outside service (an analytics script, a booking widget, images from another host),
add its domain to the matching part of that policy, or the browser will block it.
The one inline `<script>` in each page's `<head>` is allowed by its hash; if you change that line,
the hash in `script-src` has to change too.

## Deploy on Vercel
1. Put this folder in a GitHub repo (or drag the folder into vercel.com/new).
2. Framework preset: **Other**. No build command. Output directory: the folder root.
3. Deploy.

## Editing content
Text, prices and bottles are written directly in the HTML files. The header and footer
are repeated on each page, so a change to the nav or address needs to be made in all six.

Images:
- `assets/img/logo.png` and `logo-small.png`: the logo (from the bar mat artwork), in the site's champagne (#E6C280).
- `assets/img/lounge-*.jpg`: the three lounge photos on The House page.
- Everything else (most photos, bottle shots, the hero video, the menu PDF) loads from the existing
  Cloudinary account (`res.cloudinary.com/qrfzvmif`). To swap one, change its URL in the page.

## Home page video sequence
Timings are in `assets/main.js` (Home hero section) and on the two lines in `index.html` (`data-from` / `data-to`, in seconds):
"Few find it." 0 to 4.2s, "Fewer own the night." 5.8 to 8.8s, then the logo and Enter button from 11.4s,
a slow fade to black after the video ends, and a fade back up into the first frame.

## Reservations
Each request is saved as a row in a Google Sheet and emailed to you.
Setup (about 5 minutes, once) is in `apps-script/README.md`; the web-app URL goes into
`SHEET_URL` at the top of `assets/main.js`.

The old Strapi CMS is turned off (`CMS_URL` is empty). The comment next to `CMS_URL`
in `main.js` says how to turn it back on.

Opening days and seating times for the date and time pickers are set at the top of `main.js`.
