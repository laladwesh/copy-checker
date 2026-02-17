const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const { Readable } = require("stream");
const { promises: fs } = require("fs");
const path = require("path");
const PDFPoppler = require("pdf-poppler"); // <<< CHANGE HERE

// Import Google Drive utility functions
const {
  getOrCreateFolder,
  uploadFileToFolder,
  getDriveFile, // Smart file fetcher with fallback
} = require("../config/googleDrive");

/**
 * Downloads a file from Google Drive as a Buffer.
 * @param {string} fileId The Google Drive file ID.
 * @returns {Promise<Buffer>} The file content as a Buffer.
 */
async function downloadFileFromDrive(fileId) {
  const driveRes = await getDriveFile(
    fileId,
    { alt: "media" },
    { responseType: "stream" }
  );

  return new Promise((resolve, reject) => {
    const chunks = [];
    driveRes.data
      .on("data", (chunk) => chunks.push(chunk))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .on("error", (err) => reject(err));
  });
}

/**
 * Converts a PDF buffer into individual image buffers (one per page).
 * Requires 'poppler-utils' to be installed on the system.
 * @param {Buffer} pdfBuffer The PDF content as a Buffer.
 * @param {string} tempDir A temporary directory to store intermediate files.
 * @returns {Promise<{buffers: Buffer[], totalPages: number}>} An array of image buffers and total pages.
 */
async function convertPdfToImages(pdfBuffer, tempDir) {
  const inputPdfPath = path.join(tempDir, `temp_input_${Date.now()}.pdf`);
  await fs.writeFile(inputPdfPath, pdfBuffer);

  const outputPath = path.join(tempDir, "page"); // Output prefix for images
  const options = {
    format: "jpeg", // Output format (png, jpeg, etc.)
    out_dir: tempDir,
    out_prefix: "page",
    page: null, // Process all pages
  };

  // <<< CHANGE THIS LINE
  // The PDFPoppler module itself is the function to call, not a constructor.
  await PDFPoppler.convert(inputPdfPath, options);

  // Read generated image files
  const files = await fs.readdir(tempDir);
  const imageFiles = files
    .filter((file) => file.startsWith("page-") && file.endsWith(".jpg"))
    .sort((a, b) => {
      // Sort numerically
      const numA = parseInt(a.match(/page-(\d+)\.jpg/)[1]);
      const numB = parseInt(b.match(/page-(\d+)\.jpg/)[1]);
      return numA - numB;
    });

  const imageBuffers = [];
  for (const file of imageFiles) {
    const buffer = await fs.readFile(path.join(tempDir, file));
    imageBuffers.push(buffer);
    await fs.unlink(path.join(tempDir, file)); // Clean up temp image file
  }
  await fs.unlink(inputPdfPath); // Clean up temp PDF file

  return { buffers: imageBuffers, totalPages: imageBuffers.length };
}

/**
 * Processes a PDF file from Google Drive:
 * 1. Downloads the PDF.
 * 2. Converts each page to an image.
 * 3. Uploads each image to Google Drive into a specific folder.
 * 4. Returns an array of uploaded image file information.
 * @param {string} pdfDriveId The Google Drive ID of the original PDF file.
 * @param {string} parentFolderId The Google Drive ID of the parent folder to store page images.
 * @param {string} prefix A prefix for the uploaded image filenames (e.g., 'qp' or 'ac').
 * @returns {Promise<{pageImageFiles: Array<{pageNumber: number, id: string, viewLink: string, contentLink: string}>, totalPages: number}>}
 */
async function processPdfForPageImages(pdfDriveId, parentFolderId, prefix) {
  const tempDir = path.join(
    __dirname,
    "..",
    "temp",
    `pdf_process_${Date.now()}`
  );
  await fs.mkdir(tempDir, { recursive: true });

  try {
    const pdfBuffer = await downloadFileFromDrive(pdfDriveId);
    const { buffers: imageBuffers, totalPages } = await convertPdfToImages(
      pdfBuffer,
      tempDir
    );

    const pageImageFiles = [];
    for (let i = 0; i < imageBuffers.length; i++) {
      const pageNumber = i + 1;
      const filename = `${prefix}_page_${pageNumber}.jpeg`;
      const mimeType = "image/jpeg";

      const uploadedFile = await uploadFileToFolder(
        imageBuffers[i],
        filename,
        mimeType,
        parentFolderId
      );
      pageImageFiles.push({
        pageNumber,
        id: uploadedFile.id,
        viewLink: uploadedFile.viewLink,
        contentLink: uploadedFile.contentLink,
      });
    }

    return { pageImageFiles, totalPages };
  } finally {
    // Clean up the temporary directory
    if (await fs.stat(tempDir).catch(() => false)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = { processPdfForPageImages };
