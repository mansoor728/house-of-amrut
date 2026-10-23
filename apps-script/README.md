# Reservation requests: Google Sheet + email

Every request from the Contact page is saved as a row in a Google Sheet and emailed to you.
Free, no server. Takes about 5 minutes to set up, once.

## 1. Make the sheet
1. Go to sheets.google.com and create a blank sheet. Name it "House of Amrut Reservations".
2. In the menu: **Extensions → Apps Script**.

## 2. Add the script
1. Delete everything in the `Code.gs` editor.
2. Paste in the contents of `Code.gs` from this folder.
3. On line 9, replace `you@example.com` with the email that should get requests.
4. Click the save icon.

## 3. Run setup once
1. In the toolbar's function dropdown, choose **setup**, then click **Run**.
2. Google asks for permission. Click **Review permissions**, pick your account,
   then **Advanced → Go to (project name) → Allow**. (It warns because you wrote the script yourself; that's normal.)
3. Back in the sheet you'll see a new **Reservations** tab with headers.

## 4. Publish it
1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

## 5. Connect the website
1. Open `assets/main.js`.
2. Paste the URL between the quotes on the `SHEET_URL` line near the top:
   `var SHEET_URL = "https://script.google.com/macros/s/.../exec";`
3. Save, refresh the site, and send a test request.

## Day to day
- Each request arrives as an email. Hit **Reply** to answer the guest directly.
- The sheet has a **Status** column (New / Confirmed / Declined / Cancelled) to track them.
- Share the sheet with anyone else on the team who handles bookings.

## Built-in protections
- Only accepts dates, times, party sizes and experiences the website actually offers.
  If you change opening days or seating times in `assets/main.js`, change them at the top of `Code.gs` too.
- Spam limits: 3 requests per email address and 30 in total per hour (adjustable at the top of `Code.gs`).
- If the daily email quota runs out, the request is still saved to the sheet.

## If you change the script later
Use **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**.
This keeps the same URL. Making a *new* deployment gives a new URL, which you'd then
have to paste into `main.js` again.

Free Gmail accounts can send about 100 emails a day, which is plenty here.
