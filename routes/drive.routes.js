const express = require('express');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const router = express.Router();

// Import Mongoose models to fetch page image IDs
const Paper = require('../models/Paper');
const Copy = require('../models/Copy');

// Set up your OAuth2 client exactly as in config/googleDrive.js
const oauth2Client = new OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Stream the raw PDF bytes down to the client (existing route, keep if needed)
router.get('/file/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const driveRes = await drive.files.get(
      { fileId: id, alt: 'media' },
      { responseType: 'stream' }
    );
    res.setHeader('Content-Type', 'application/pdf');
    driveRes.data.pipe(res);
  } catch (err) {
    next(err);
  }
});

// NEW ROUTE: Stream an individual page image
router.get('/page-image/:originalFileId/:pageNumber', async (req, res, next) => {
  try {
    const { originalFileId, pageNumber } = req.params;
    let actualImageDriveId = null;

    // First, try to find the image ID in the Paper model
    let document = await Paper.findOne({ 'driveFile.id': originalFileId });
    if (document) {
      const pageInfo = document.pageImageFiles.find(p => p.pageNumber === parseInt(pageNumber));
      if (pageInfo) {
        actualImageDriveId = pageInfo.id;
      }
    }

    // If not found in Paper, try to find it in the Copy model
    if (!actualImageDriveId) {
      document = await Copy.findOne({ 'driveFile.id': originalFileId });
      if (document) {
        const pageInfo = document.pageImageFiles.find(p => p.pageNumber === parseInt(pageNumber));
        if (pageInfo) {
          actualImageDriveId = pageInfo.id;
        }
      }
    }

    if (!actualImageDriveId) {
      return res.status(404).json({ error: 'Page image not found' });
    }

    const driveRes = await drive.files.get(
      { fileId: actualImageDriveId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Assuming images are always JPEG from pdfProcessor
    res.setHeader('Content-Type', 'image/jpeg');
    driveRes.data.pipe(res);

  } catch (err) {
    console.error("Error serving page image:", err);
    next(err);
  }
});

module.exports = router;