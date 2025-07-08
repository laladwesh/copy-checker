const express = require("express");
const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const { execFile } = require("child_process");
const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const router = express.Router();

// Import Mongoose models
const Paper = require("../models/Paper");
const Copy = require("../models/Copy");

// Set up your OAuth2 client
const oauth2Client = new OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
});
const drive = google.drive({ version: "v3", auth: oauth2Client });

/**
 * Extracts a specific page from a PDF buffer as a PNG image using pdftoppm.
 * @param {Buffer} pdfBuffer - The buffer of the PDF file.
 * @param {number} pageNumber - The 1-based page number to extract.
 * @param {string} uniqueId - A unique ID (e.g., fileId) for temporary file naming.
 * @returns {Promise<Buffer>} A Promise that resolves with the image buffer.
 */
async function extractPageAsImage(pdfBuffer, pageNumber, uniqueId) {
  const tmpDir = os.tmpdir();
  const uniqueTimestamp = Date.now();
  const tmpPdfPath = path.join(tmpDir, `${uniqueId}_${uniqueTimestamp}.pdf`);
  const outputPrefix = path.join(tmpDir, `${uniqueId}_page_${uniqueTimestamp}`);

  // Format page number with leading zero if single digit (e.g., 1 -> 01)
  // This matches pdftoppm's common behavior for -png output
  const formattedPageNumber = String(pageNumber).padStart(2, "0");

  // Expected output path for pdftoppm (e.g., ...-01.png or ...-10.png)
  const expectedImgPath = `${outputPrefix}-${formattedPageNumber}.png`;

  let actualImgPath = null; // To store the path of the found image

  try {
    console.log(`Writing temp PDF to: ${tmpPdfPath}`);
    await fs.writeFile(tmpPdfPath, pdfBuffer);

    console.log(`Executing pdftoppm for page ${pageNumber}...`);
    await new Promise((resolve, reject) => {
      execFile(
        "pdftoppm",
        [
          "-f",
          pageNumber.toString(),
          "-l",
          pageNumber.toString(),
          "-png",
          tmpPdfPath,
          outputPrefix,
        ],
        (err, stdout, stderr) => {
          if (stdout) console.log("pdftoppm stdout:", stdout);
          if (stderr) console.error("pdftoppm stderr:", stderr); // Important for diagnostics

          if (err) {
            console.error("pdftoppm execution error details:", err);
            // Provide more specific guidance if the MiKTeX error appears
            if (stderr.includes("MiKTeX requires Windows 10")) {
              return reject(
                new Error(
                  "pdftoppm failed. MiKTeX compatibility issue detected. Please check your Poppler/MiKTeX installation."
                )
              );
            }
            return reject(
              new Error(
                "pdftoppm conversion failed. Check server console for full output."
              )
            );
          }
          resolve();
        }
      );
    });

    // Check for the exactly expected image path
    if (
      await fs
        .access(expectedImgPath)
        .then(() => true)
        .catch(() => false)
    ) {
      actualImgPath = expectedImgPath;
    } else {
      // Fallback: In rare cases, some pdftoppm versions might not pad for single pages
      // Or might just output `outputPrefix.png` without page number.
      // However, with `-png` and page range, `outputPrefix-##.png` is standard.
      // The logs show it IS padding, so this fallback is less likely to be hit.
      const possibleUnpaddedPath = `${outputPrefix}-${pageNumber}.png`;
      if (
        await fs
          .access(possibleUnpaddedPath)
          .then(() => true)
          .catch(() => false)
      ) {
        actualImgPath = possibleUnpaddedPath;
      } else {
        const possibleSimplePath = `${outputPrefix}.png`; // Try this as a last resort
        if (
          await fs
            .access(possibleSimplePath)
            .then(() => true)
            .catch(() => false)
        ) {
          actualImgPath = possibleSimplePath;
        }
      }
    }

    if (!actualImgPath) {
      // If the file is still not found with expected names, list content for deeper debug
      const filesInTemp = await fs.readdir(tmpDir);
      console.error(
        `No expected image file found. Files in temp dir starting with "${uniqueId}_page_":`
      );
      filesInTemp
        .filter((f) => f.startsWith(`${uniqueId}_page_`))
        .forEach((f) => console.error(`  - ${f}`));
      throw new Error(`Generated image file not found for page ${pageNumber}.`);
    }

    console.log(`Reading generated image from: ${actualImgPath}`);
    const imageBuffer = await fs.readFile(actualImgPath);
    return imageBuffer;
  } catch (err) {
    console.error("Error in extractPageAsImage:", err);
    throw err; // Re-throw to be caught by the route handler
  } finally {
    // Clean up temporary files
    try {
      await fs.unlink(tmpPdfPath);
      console.log(`Deleted temp PDF: ${tmpPdfPath}`);
    } catch (cleanupErr) {
      console.warn(
        `Cleanup warning: Could not delete temp PDF file ${tmpPdfPath}:`,
        cleanupErr
      );
    }
    if (actualImgPath) {
      try {
        if (
          await fs
            .access(actualImgPath)
            .then(() => true)
            .catch(() => false)
        ) {
          await fs.unlink(actualImgPath);
          console.log(`Deleted temp image: ${actualImgPath}`);
        }
      } catch (cleanupErr) {
        console.warn(
          `Cleanup warning: Could not delete temp image file ${actualImgPath}:`,
          cleanupErr
        );
      }
    }
  }
}

// Stream the raw PDF bytes down to the client (existing route)
router.get("/file/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const driveRes = await drive.files.get(
      { fileId: id, alt: "media" },
      { responseType: "stream" }
    );
    res.setHeader("Content-Type", "application/pdf");
    driveRes.data.pipe(res);
  } catch (err) {
    console.error("Error serving full PDF file:", err);
    next(err); // Pass error to Express error handling middleware
  }
});

// NEW ROUTE: Stream an individual page image by extracting it from the full PDF
router.get(
  "/page-image/:originalFileId/:pageNumber",
  async (req, res, next) => {
    try {
      const { originalFileId, pageNumber } = req.params;

      // Verify if originalFileId exists in either Paper or Copy models in your database
      const paperExists = await Paper.exists({
        "driveFile.id": originalFileId,
      });
      const copyExists = await Copy.exists({ "driveFile.id": originalFileId });

      if (!paperExists && !copyExists) {
        return res
          .status(404)
          .json({ error: "Original PDF file not found in database." });
      }

      // 1. Fetch the entire PDF file from Google Drive
      const driveRes = await drive.files.get(
        { fileId: originalFileId, alt: "media" },
        { responseType: "arraybuffer" }
      );

      const pdfBuffer = Buffer.from(driveRes.data);

      // 2. Extract the specific page as an image using the pdftoppm helper
      const imageBuffer = await extractPageAsImage(
        pdfBuffer,
        parseInt(pageNumber),
        originalFileId
      );

      // 3. Set the content type and send the image
      res.setHeader("Content-Type", "image/png"); // pdftoppm with -png outputs PNG
      res.send(imageBuffer);
    } catch (err) {
      console.error("Error serving page image:", err);
      // Include more specific error if available, otherwise generic
      res
        .status(500)
        .json({
          error:
            err.message ||
            "Failed to serve page image. Check server logs for details.",
        });
    }
  }
);

module.exports = router;
