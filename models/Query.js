const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema({
    copy: { type: mongoose.Schema.Types.ObjectId, ref: 'Copy', required: true },
    pageNumber: { type: Number, required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    // MODIFIED: Updated enum for query status to include 'resolved_by_examiner'
    status: {
        type: String,
        enum: ['pending', 'approved_by_admin', 'rejected_by_admin', 'resolved_by_admin', 'resolved_by_examiner'],
        default: 'pending'
    },
    response: String, // Admin's or Examiner's response to the query
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Query', QuerySchema);
