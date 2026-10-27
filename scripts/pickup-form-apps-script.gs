/**
 * MERGE into your existing Google Apps Script doPost — do not replace the whole project.
 * The website sends scrap_photo_count and scrap_photo_1_base64, scrap_photo_2_base64, …
 *
 * 1. Create a Drive folder for pickup photos → copy its ID into FOLDER_ID below.
 * 2. Add columns on pickupForm sheet: "Scrap photos" (links), "Photo count".
 * 3. Inside your pickupForm branch, call: var links = savePickupScrapPhotos_(e.parameter);
 *    and append links.join('\n') to the row you write.
 */

var PICKUP_PHOTO_FOLDER_ID = 'REPLACE_WITH_GOOGLE_DRIVE_FOLDER_ID';

/** @param {Object<string,string>} params */
function savePickupScrapPhotos_(params) {
  var links = [];
  var count = parseInt(params.scrap_photo_count || '0', 10);
  if (!count || !PICKUP_PHOTO_FOLDER_ID || PICKUP_PHOTO_FOLDER_ID.indexOf('REPLACE_') === 0) {
    return links;
  }
  var folder = DriveApp.getFolderById(PICKUP_PHOTO_FOLDER_ID);
  for (var i = 1; i <= count; i++) {
    var b64 = params['scrap_photo_' + i + '_base64'];
    if (!b64) continue;
    var name = params['scrap_photo_' + i + '_name'] || 'scrap-' + i + '.jpg';
    var mime = params['scrap_photo_' + i + '_mime'] || 'image/jpeg';
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    links.push(file.getUrl());
  }
  return links;
}
