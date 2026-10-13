# Sireenity Dental Clinic & Skinsense Aesthetic Center website

A single-page website: services, FAQs, appointment requests, and a map.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page content |
| `assets/css/style.css` | Design and layout |
| `assets/js/main.js` | Search, booking form, map |
| `assets/img/` | Logos and service images |
| `google-apps-script/Code.gs` | Script that saves appointment requests to a Google Sheet |
| `_originals/` | Full-size original images. Keep as a backup; do not upload to the web host. |

To publish the site, upload `index.html` and the `assets` folder to your web host.

## How appointment requests work

1. A patient fills in the booking form on the website.
2. The request is added as a new row in the clinic's Google Sheet, with the status **Pending**.
3. The clinic gets an email about the new request.
4. Staff text or call the patient to agree on a time, then change the **Status** column to
   **Confirmed**, **Rescheduled**, **Cancelled**, or **Done**.

The Google Sheet is the clinic's list of requests. The website does not show patients
which slots are free and does not confirm bookings by itself; staff confirm each one.

Until the Google Sheet is connected (steps below), the form asks the patient to send
the request by SMS to the clinic instead.

## Connect the booking form to a Google Sheet (one time, about 10 minutes)

Use the Google account the clinic wants to receive the requests and emails.

### 1. Create the sheet

1. Go to <https://sheets.new> and sign in with the clinic's Google account.
2. Name the file, for example `Sireenity Appointments`.

### 2. Add the script

1. In the sheet, open **Extensions > Apps Script**.
2. Delete everything in the editor.
3. Open `google-apps-script/Code.gs` from this folder, copy all of it, and paste it into the editor.
4. Click the **Save** icon.

### 3. Test it and grant permission

1. In the function dropdown at the top of the editor, choose **testSetup**, then click **Run**.
2. Google asks for permission. Click **Review permissions**, choose the clinic account,
   then **Advanced > Go to (project name) > Allow**. The warning appears because the
   script is your own and not reviewed by Google; that is expected.
3. Go back to the sheet. There should be a new **Appointments** tab with one test row,
   and a test email in the clinic's inbox. Delete the test row.

### 4. Publish the script

1. In the Apps Script editor, click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as** to **Me**, and **Who has access** to **Anyone**.
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

### 5. Put the URL in the website

1. Open `assets/js/main.js`.
2. Find this line near the top:

   ```js
   const BOOKING_ENDPOINT = "";
   ```

3. Paste the URL between the quotes:

   ```js
   const BOOKING_ENDPOINT = "https://script.google.com/macros/s/XXXXXXXX/exec";
   ```

4. Save, then upload the updated `main.js` to your web host.

### 6. Check it

Open the website, send a test request, and confirm that a row appears in the sheet and
an email arrives.

## Good to know

- **Sending requests to a different email:** in `Code.gs`, put the address in
  `const NOTIFY_EMAIL = "";`, then redeploy (below).
- **After editing the script:** changes only go live after **Deploy > Manage deployments >
  Edit (pencil) > Version: New version > Deploy**. The URL stays the same.
- **Email limit:** a free Google account can send about 100 of these emails a day.
- **Privacy:** the sheet holds patients' names and phone numbers. Share it only with
  clinic staff.
- **If the sheet cannot be reached** (for example, the script was removed), the form
  falls back to asking the patient to send the request by SMS, so requests are not lost.

## Updating clinic details

- Phone number and address appear in `index.html` (search for `0947`) and at the top of
  `assets/js/main.js` in the `CLINIC` block. Change both.
- The map pin is the `coords` value in the same `CLINIC` block.
