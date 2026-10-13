/**
 * Sireenity Dental Clinic - appointment request receiver.
 *
 * Paste this file into the Apps Script editor of the clinic's Google Sheet
 * (Extensions > Apps Script) and deploy it as a web app. Every request sent
 * from the website's booking form is added as a row in the "Appointments"
 * tab and emailed to the clinic. See README.md for the full setup steps.
 */

// Leave blank to email the owner of the Google Sheet.
const NOTIFY_EMAIL = "";

const SHEET_NAME = "Appointments";
const HEADERS = [
  "Received",
  "Name",
  "Mobile number",
  "Service",
  "Preferred date",
  "Preferred time",
  "Message",
  "Status",
];
const STATUSES = ["Pending", "Confirmed", "Rescheduled", "Cancelled", "Done"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse(e.postData.contents);

    // Bots fill the hidden honeypot field; real visitors never see it.
    if (data.hp_field) return respond({ ok: true });

    const request = validate(data);
    const sheet = getSheet();
    sheet.appendRow([
      new Date(),
      safeCell(request.name),
      safeCell(request.phone),
      safeCell(request.service),
      safeCell(request.date),
      safeCell(request.time),
      safeCell(request.message),
      STATUSES[0],
    ]);

    notifyClinic(request);
    return respond({ ok: true });
  } catch (error) {
    console.error(error);
    return respond({ ok: false, error: String(error.message || error) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the web app URL in a browser shows this, to confirm it is deployed.
function doGet() {
  return respond({ ok: true, message: "Sireenity booking endpoint is running." });
}

function validate(data) {
  const text = (value, max) => String(value || "").trim().slice(0, max);
  const request = {
    name: text(data.name, 80),
    phone: text(data.phone, 20),
    service: text(data.service, 80),
    date: text(data.date, 10),
    time: text(data.time, 30),
    message: text(data.message, 500),
  };

  if (request.name.length < 2) throw new Error("Name is required.");
  if (!/^(?:\+63|0)9\d{9}$/.test(request.phone.replace(/[\s().-]/g, ""))) {
    throw new Error("A valid mobile number is required.");
  }
  if (!request.service) throw new Error("Service is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.date)) {
    throw new Error("Preferred date is required.");
  }
  return request;
}

// Stops text such as "=IMPORTXML(...)" or "+63..." being run as a formula.
function safeCell(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(SHEET_NAME);
  sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e6f5f5");
  sheet.getRange("A:A").setNumberFormat("mmm d, yyyy h:mm am/pm");
  sheet.getRange("C:C").setNumberFormat("@");
  sheet.getRange("E:E").setNumberFormat("@");

  // Staff update the Status column from a dropdown.
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .build();
  sheet.getRange(2, HEADERS.length, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);
  sheet.setColumnWidths(1, HEADERS.length, 150);
  sheet.setColumnWidth(7, 320);
  return sheet;
}

function notifyClinic(request) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const owner = spreadsheet.getOwner();
  const recipient =
    NOTIFY_EMAIL || (owner && owner.getEmail()) || Session.getEffectiveUser().getEmail();
  if (!recipient) return;

  const lines = [
    "A new appointment request was sent from the website.",
    "",
    "Name: " + request.name,
    "Mobile number: " + request.phone,
    "Service: " + request.service,
    "Preferred date: " + request.date,
    "Preferred time: " + (request.time || "Any"),
    "Message: " + (request.message || "-"),
    "",
    "Contact the patient to confirm, then update the Status column:",
    spreadsheet.getUrl(),
  ];

  MailApp.sendEmail({
    to: recipient,
    subject: "New appointment request: " + request.name + " (" + request.date + ")",
    body: lines.join("\n"),
  });
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Run this once from the editor (Run > testSetup) to grant permissions and
 * check that a row is added and the email arrives. Delete the test row after.
 */
function testSetup() {
  const result = doPost({
    postData: {
      contents: JSON.stringify({
        name: "Test Patient",
        phone: "0917-123-4567",
        service: "Dental Cleaning",
        date: "2030-01-15",
        time: "Morning",
        message: "This is a test request.",
      }),
    },
  });
  console.log(result.getContent());
}
