// routes/admin.routes.js
const express = require('express');
const {
    createUser,
    listUsers,
    getStudentsByBatch,
    getExaminers,
    createExam,
    listPapers,
    assignExaminersToExam,
    uploadCopy,
    listCopies,
    listQueries,
    approveQuery,
    rejectQuery,
    toggleCopyRelease,
    uploadScannedCopy,
    getCopiesByExam,
    getAdminCopyDetails
} = require('../controllers/admin.controller');
const { verifyToken } = require('../middleware/jwtAuth');
const { ensureRole } = require('../middleware/auth');
const upload = require('../middleware/fileUpload'); // Assumed to export a configured multer instance

const router = express.Router();

router.use(verifyToken, ensureRole('admin'));

// User Management
router.post('/users', createUser);
router.get('/users', listUsers);
router.get('/students', getStudentsByBatch);
router.get('/examiners', getExaminers);

// Exam (Question Paper) Management - "pool where all exams should be there"
// MODIFIED: To accept either a single 'paper' (PDF) or multiple 'images' for a question paper
router.post('/exams',
    upload.fields([
        { name: 'paper', maxCount: 1 },    // For a single PDF question paper
        { name: 'images', maxCount: 50 }   // For multiple image question paper (adjust maxCount)
    ]),
    createExam // Your controller will now correctly receive req.files.paper or req.files.images
);
router.get('/exams', listPapers); // List all exams (papers)

// NEW: Assign examiners to an exam (paper) and distribute copies
router.post('/exams/:id/assign-examiners', assignExaminersToExam);

// Answer Copy Management (Manual Uploads) - "pahle student ki saari copies upload ho jae"
// Assuming 'uploadCopy' also needs to handle both, if it's for scanned answer copies.
// If this route is *only* for PDF copies, then 'upload.single('copyPdf')' is fine.
// If it's for scanned copies, you should use the same logic as 'uploadScannedCopy'.
router.post('/copies',
    upload.fields([
        { name: 'copyPdf', maxCount: 1 },
        { name: 'images', maxCount: 20 } // For images
    ]),
    uploadCopy
);
router.get('/copies', listCopies);

// Query Management
router.get('/queries', listQueries);
router.patch('/queries/:id/approve', approveQuery);
router.patch('/queries/:id/reject', rejectQuery);
router.get('/exams/:examId/copies', getCopiesByExam); // Get all copies for a specific exam
router.get('/copies/view/:id', getAdminCopyDetails); // Get details of a single copy for admin viewing
// Admin Features
router.patch('/copies/:id/toggle-release', toggleCopyRelease);
// Assuming 'uploadScannedCopy' handles multiple images or a single PDF for answer sheets
router.post('/upload/scanned-copy',
    upload.fields([
        { name: 'scannedPdf', maxCount: 1 },  // For single PDF scanned copy
        { name: 'scannedImages', maxCount: 50 } // For multiple image scanned copies
    ]),
    uploadScannedCopy
);

module.exports = router;