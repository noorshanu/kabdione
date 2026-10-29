/**
 * Google Apps Script for Form Submissions
 * Handles: pickupForm, franchiseForm, contactForm, careerForm
 *
 * PHOTOS (pickup booking):
 * 1. Create a folder in Google Drive for scrap photos
 * 2. Copy folder ID from URL (.../folders/FOLDER_ID)
 * 3. Set PICKUP_PHOTO_FOLDER_ID below
 * 4. On sheet "Pickup Requests", add headers in columns K & L if missing:
 *    "Scrap photos", "Photo count"
 * 5. Redeploy web app (Manage deployments → Edit → New version → Deploy)
 */

const SPREADSHEET_ID = '1ynzThHgBiRRXzH4vFlikzsU_E1NGBnKFOO6wkSa-eN0';

/** Paste Drive folder ID here (required for photos to save) */
const PICKUP_PHOTO_FOLDER_ID = 'REPLACE_WITH_GOOGLE_DRIVE_FOLDER_ID';

const SHEET_NAMES = {
  pickupForm: 'Pickup Requests',
  franchiseForm: 'Franchise Applications',
  contactForm: 'Contact Messages',
  careerForm: 'Career Applications',
};

const FORM_HEADERS = {
  pickupForm: [
    'Timestamp',
    'Name',
    'Phone',
    'Category',
    'District',
    'Current Location',
    'Pincode',
    'Pickup Date',
    'Pickup Time',
    'Source',
    'Scrap photos',
    'Photo count',
  ],
  franchiseForm: [
    'Timestamp',
    'Name',
    'Phone',
    'Email',
    'Age',
    'Gender',
    'City',
    'State',
    'Property',
    'Space (sq. ft.)',
    'Investment Capacity',
    'Financial Assistance',
    'Reason',
    'Experience',
  ],
  contactForm: [
    'Timestamp',
    'Name',
    'Phone',
    'Email',
    'Subject',
    'Message',
    'Pickup Opt-in',
  ],
  careerForm: [
    'Timestamp',
    'Full Name',
    'Phone',
    'Email',
    'Date of Birth',
    'Address',
    'Education',
    'Specialization',
    'Passing Year',
    'Previous Role',
    'Skills',
    'Preferred Location',
    'Expected Salary',
    'Available From',
    'Cover Letter',
    'Source',
  ],
};

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetNames = Object.values(SHEET_NAMES);
    const existingSheets = [];

    for (let i = 0; i < sheetNames.length; i++) {
      const sheet = ss.getSheetByName(sheetNames[i]);
      if (sheet) {
        const rowCount = sheet.getLastRow() - 1;
        existingSheets.push({
          name: sheetNames[i],
          submissions: rowCount > 0 ? rowCount : 0,
        });
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Form Handler Status</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { color: #1a73e8; }
          .status { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .sheet { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .success { color: #0bb169; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>✅ Form Handler is Active</h1>
        <div class="status">
          <p class="success">Your Google Apps Script is deployed and ready to receive form submissions!</p>
          <p><strong>Spreadsheet ID:</strong> ${SPREADSHEET_ID}</p>
          <p><strong>Pickup photos folder:</strong> ${
            PICKUP_PHOTO_FOLDER_ID.indexOf('REPLACE_') === 0 ? '⚠️ Not configured' : 'Configured'
          }</p>
        </div>
        <h2>Form Sheets Status:</h2>
        ${
          existingSheets.length > 0
            ? existingSheets
                .map(
                  (s) => `
            <div class="sheet">
              <strong>${s.name}</strong><br>
              Submissions: ${s.submissions}
            </div>
          `
                )
                .join('')
            : '<p>No sheets created yet. They will be created automatically on first submission.</p>'
        }
      </body>
      </html>
    `;

    return HtmlService.createHtmlOutput(html);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: 'Error accessing spreadsheet: ' + error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const formData = e.parameter || {};

    const normalizedData = {};
    for (const key in formData) {
      const value = formData[key];
      normalizedData[key] = Array.isArray(value) ? value[0] : value;
    }

    if (normalizedData.hp && String(normalizedData.hp).trim() !== '') {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Spam detected' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const formType = normalizedData.sheetName || normalizedData.form_id || 'contactForm';

    if (!FORM_HEADERS[formType]) {
      return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'Invalid form type: ' + formType })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    let sheet = ss.getSheetByName(SHEET_NAMES[formType]);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES[formType]);
      sheet
        .getRange(1, 1, 1, FORM_HEADERS[formType].length)
        .setValues([FORM_HEADERS[formType]])
        .setFontWeight('bold')
        .setBackground('#f0f0f0');
      sheet.setFrozenRows(1);
    } else {
      ensurePickupPhotoHeaders_(sheet, formType);
    }

    const rowData = getRowData(formType, normalizedData);
    sheet.appendRow(rowData);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, message: 'Form submitted successfully' })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** Add photo columns to existing Pickup sheet (one-time safe). */
function ensurePickupPhotoHeaders_(sheet, formType) {
  if (formType !== 'pickupForm') return;
  const headers = FORM_HEADERS.pickupForm;
  const lastCol = sheet.getLastColumn();
  if (lastCol >= headers.length) return;

  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const needed = headers.slice(existing.length);
  if (needed.length === 0) return;

  sheet.getRange(1, lastCol + 1, 1, lastCol + needed.length).setValues([needed]);
  sheet.getRange(1, lastCol + 1, 1, lastCol + needed.length).setFontWeight('bold');
}

/**
 * Saves base64 scrap photos from website (/api/submit-form) into Drive.
 * @param {Object<string,string>} formData
 * @returns {{links: string[], count: number}}
 */
function savePickupScrapPhotos_(formData) {
  const links = [];
  const count = parseInt(formData.scrap_photo_count || '0', 10);
  if (!count) {
    return { links: links, count: 0 };
  }
  if (!PICKUP_PHOTO_FOLDER_ID || PICKUP_PHOTO_FOLDER_ID.indexOf('REPLACE_') === 0) {
    Logger.log('PICKUP_PHOTO_FOLDER_ID not set — photos skipped');
    return { links: links, count: count };
  }

  const folder = DriveApp.getFolderById(PICKUP_PHOTO_FOLDER_ID);
  const submissionTag = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

  for (let i = 1; i <= count; i++) {
    const b64 = formData['scrap_photo_' + i + '_base64'];
    if (!b64) continue;
    const name = formData['scrap_photo_' + i + '_name'] || 'scrap-' + i + '.jpg';
    const mime = formData['scrap_photo_' + i + '_mime'] || 'image/jpeg';
    const blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, submissionTag + '-' + name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    links.push(file.getUrl());
  }

  return { links: links, count: links.length };
}

function getRowData(formType, formData) {
  const timestamp = new Date();
  const row = [timestamp];

  function getValue(key) {
    const val = formData[key];
    return val ? String(val).trim() : '';
  }

  switch (formType) {
    case 'pickupForm': {
      const photos = savePickupScrapPhotos_(formData);
      row.push(
        getValue('name'),
        getValue('phone'),
        getValue('category'),
        getValue('area'),
        getValue('currentLocation'),
        getValue('pincode'),
        getValue('date'),
        getValue('time'),
        getValue('source'),
        photos.links.join('\n'),
        String(photos.count)
      );
      break;
    }

    case 'franchiseForm':
      row.push(
        getValue('name'),
        getValue('phone'),
        getValue('email'),
        getValue('age'),
        getValue('gender'),
        getValue('city'),
        getValue('state'),
        getValue('property'),
        getValue('space'),
        getValue('investment'),
        getValue('assistance'),
        getValue('reason'),
        getValue('experience')
      );
      break;

    case 'contactForm':
      row.push(
        getValue('name'),
        getValue('phone'),
        getValue('email'),
        getValue('subject'),
        getValue('message'),
        formData.pickup_opt === 'yes' ? 'Yes' : 'No'
      );
      break;

    case 'careerForm': {
      let education = formData['education[]'] || formData.education;
      let educationStr = '';
      if (Array.isArray(education)) {
        educationStr = education.join(', ');
      } else if (education) {
        educationStr = String(education);
      }

      row.push(
        getValue('full_name'),
        getValue('phone'),
        getValue('email'),
        getValue('dob'),
        getValue('address'),
        educationStr,
        getValue('specialization'),
        getValue('passing_year'),
        getValue('prev_role'),
        getValue('skills'),
        getValue('preferred_location'),
        getValue('salary'),
        getValue('available_from'),
        getValue('cover'),
        getValue('source')
      );
      break;
    }

    default:
      row.push('Unknown form type');
  }

  return row;
}

function testSetup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log('Spreadsheet opened: ' + ss.getName());
  for (const sheetName of Object.values(SHEET_NAMES)) {
    const sheet = ss.getSheetByName(sheetName);
    Logger.log('Sheet "' + sheetName + '": ' + (sheet ? 'exists' : 'will be created on submit'));
  }
}
