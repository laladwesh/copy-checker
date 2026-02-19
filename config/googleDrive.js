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
 * Detect which Drive account owns a folder ID
 * @param {string} folderId - The folder ID to check
 * @returns {object|null} The drive client that owns this folder, or null if not found
 */
async function detectFolderOwner(folderId) {
  if (!folderId) {
    console.log("[Drive] No folderId provided, using NEW account as default");
    return drive;
  }

  console.log(`[Drive] Detecting owner of folder: ${folderId}`);
  
  // Try new account first
  try {
    await drive.files.get({ fileId: folderId, fields: "id" });
    console.log(`[Drive] Folder ${folderId} belongs to NEW account`);
    return drive;
  } catch (error) {
    console.log(`[Drive] Folder ${folderId} NOT in new account (${error.code})`);
    
    // If not found in new account and old account exists, try old account
    if (error.code === 404 && driveOld) {
      console.log(`[Drive] Checking OLD account for folder ${folderId}...`);
      try {
        await driveOld.files.get({ fileId: folderId, fields: "id" });
        console.log(`[Drive] ✓ Folder ${folderId} belongs to OLD account`);
        return driveOld;
      } catch (oldError) {
        console.error(`[Drive] ✗ Folder ${folderId} NOT found in old account either (${oldError.code})`);
        return null;
      }
    } else if (!driveOld) {
      console.warn(`[Drive] ⚠️ Old account credentials not configured. Cannot check old account.`);
      console.warn(`[Drive] Add GOOGLE_DRIVE_OLD_* credentials to .env to enable fallback.`);
    }
    return null;
  }
}

/**
 * Smart folder creation: detects parent folder owner and uses the correct account
 * @param {string} name - Folder name to create/find
 * @param {string} parentId - Parent folder ID (optional)
 */
async function getOrCreateFolder(name, parentId) {
  // Ensure name is a string before calling replace.
  // This also handles cases where name might be an ObjectId from student._id
  const folderName = String(name);

  // Detect which account owns the parent folder
  const driveClient = await detectFolderOwner(parentId);
  
  if (!driveClient) {
    const errorMsg = `Parent folder ${parentId} not found in any configured Drive account. ` +
      `This folder may belong to the old Drive account. ` +
      `Please ensure GOOGLE_DRIVE_OLD_* credentials are configured in .env file.`;
    console.error(`[Drive Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const q = [
    `'${parentId || "root"}' in parents`,
    `mimeType='application/vnd.google-apps.folder'`,
    `name='${folderName.replace(/'/g, "\\'")}'`, // Use folderName here
    `trashed=false`,
  ].join(" and ");

  try {
    const res = await driveClient.files.list({ q, fields: "files(id)" });
    if (res.data.files.length) {
      console.log(
        `[Drive] Folder '${folderName}' found with ID: ${res.data.files[0].id}`
      );
      return res.data.files[0].id;
    }

    console.log(`[Drive] Folder '${folderName}' not found, creating using ${driveClient === driveOld ? 'OLD' : 'NEW'} account...`);
    const folder = await driveClient.files.create({
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
 * Smart file upload: detects parent folder owner and uses the correct account
 * @param {Buffer} buffer - File content as buffer
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 * @param {string} folderId - Parent folder ID
 */
async function uploadFileToFolder(buffer, filename, mimeType, folderId) {
  // Detect which account owns the parent folder
  const driveClient = await detectFolderOwner(folderId);
  
  if (!driveClient) {
    throw new Error(`Parent folder ${folderId} not found in any Drive account`);
  }

  const media = { mimeType, body: bufferToStream(buffer) };
  try {
    console.log(`[Drive] Uploading '${filename}' using ${driveClient === driveOld ? 'OLD' : 'NEW'} account...`);
    
    const createRes = await driveClient.files.create({
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
    await driveClient.permissions.create({
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