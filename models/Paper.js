// Example of your Paper model schema (adjust if different)
const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    title: String,
    course: String,
    examType: String,
    date: Date,
    totalMarks: Number,
    driveFile: {
        id: { type: String, required: true }, // This was the missing part
        url: { type: String, required: true }, // Ensure this matches what you store (webContentLink or webViewLink)
        viewLink: { type: String }, // Optional, if you want to store it separately
    },
    driveFolderId: { type: String },
    totalPages: Number,
    assignedExaminers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);