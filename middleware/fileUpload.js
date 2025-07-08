// middleware/fileUpload.js
const multer = require("multer");
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // allow images
  if (file.mimetype.startsWith("image/")) return cb(null, true);
  // allow PDFs
  if (file.mimetype === "application/pdf") return cb(null, true);
  // otherwise reject
  cb(new Error("Only image or PDF files are allowed"), false);
};

module.exports = multer({ storage, fileFilter });
