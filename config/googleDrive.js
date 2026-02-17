// config/googleDrive.js
require("dotenv").config();
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const { Readable } = require("stream");

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// Primary Drive client (NEW 20TB account for uploads)
const oauth2Client = new OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

// Fallback Drive client (OLD 15GB account for existing files)
let driveOld = null;
if (
  process.env.GOOGLE_DRIVE_OLD_CLIENT_ID &&
  process.env.GOOGLE_DRIVE_OLD_REFRESH_TOKEN
) {
  const oauth2ClientOld = new OAuth2(
    process.env.GOOGLE_DRIVE_OLD_CLIENT_ID,
    process.env.GOOGLE_DRIVE_OLD_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_OLD_REDIRECT_URI
  );

  oauth2ClientOld.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_OLD_REFRESH_TOKEN,
  });

  driveOld = google.drive({ version: "v3", auth: oauth2ClientOld });
  console.log("[Drive] Old account fallback configured for existing files.");
}

/**
 * Smart file fetcher: tries new account first, falls back to old account if 404
 * @param {string} fileId - The Google Drive file ID
 * @param {object} requestParams - Request parameters (e.g., { alt: 'media' })
 * @param {object} config - Config options (e.g., { responseType: 'stream' })
 */
async function getDriveFile(fileId, requestParams = {}, config = {}) {
  try {
    // Try new account first
    return await drive.files.get({ fileId, ...requestParams }, config);
  } catch (error) {
    // If 404 and old account exists, try old account
    if (error.code === 404 && driveOld) {
      console.log(
        `[Drive] File ${fileId} not found in new account, trying old account...`
      );
      return await driveOld.files.get({ fileId, ...requestParams }, config);
    }
    // Otherwise, throw the original error
    throw error;
  }
}

/**
 * Find or create a folder by name under the given parent.
 */
async function getOrCreateFolder(name, parentId) {
  // Ensure name is a string before calling replace.
  // This also handles cases where name might be an ObjectId from student._id
  const folderName = String(name);

  const q = [
    `'${parentId || "root"}' in parents`,
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${folderName.replace(/'/g, "\\'")}'`, // Use folderName here
    `trashed=false`,
  ].join(" and ");

  try {
    const res = await drive.files.list({ q, fields: "files(id)" });
    if (res.data.files.length) {
      console.log(
        `[Drive] Folder '${folderName}' found with ID: ${res.data.files[0].id}`
      );
      return res.data.files[0].id;
    }

    console.log(`[Drive] Folder '${folderName}' not found, creating...`);
    const folder = await drive.files.create({
      requestBody: {
        name: folderName, // Use folderName here
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : [],
      },
      fields: "id", // Request ID in response
    });
    console.log(
      `[Drive] Folder '${folderName}' created with ID: ${folder.data.id}`
    );
    return folder.data.id;
  } catch (error) {
    console.error(
      `[Drive Error] Error in getOrCreateFolder for '${folderName}':`,
      error.message,
      error.errors
    );
    throw error; // Re-throw to propagate the error
  }
}

/**
 * Upload a Buffer as a file into the given folder.
 */
async function uploadFileToFolder(buffer, filename, mimeType, folderId) {
  const media = { mimeType, body: bufferToStream(buffer) };
  try {
    const createRes = await drive.files.create({
      requestBody: {
        name: filename,
        mimeType,
        parents: [folderId],
      },
      media,
      fields: "id, webViewLink, webContentLink", // Request these fields directly on create
    });

    console.log(
      `[Drive] File '${filename}' uploaded with ID: ${createRes.data.id}`
    );

    // Make the file publicly accessible via link
    await drive.permissions.create({
      fileId: createRes.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
        allowFileDiscovery: false,
      },
    });
    console.log(`[Drive] Permissions set for file '${filename}'.`);

    return {
      id: createRes.data.id,
      viewLink: createRes.data.webViewLink,
      contentLink: createRes.data.webContentLink,
    };
  } catch (error) {
    console.error(
      `[Drive Error] Error in uploadFileToFolder for '${filename}':`,
      error.message,
      error.errors
    );
    throw error; // Re-throw to propagate the error
  }
}

module.exports = {
  getOrCreateFolder,
  uploadFileToFolder,
  drive, // Primary drive instance (new account)
  driveOld, // Fallback drive instance (old account) - may be null
  getDriveFile, // Smart file fetcher with fallback
};