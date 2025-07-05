const mongoose = require('mongoose');

const QuerySchema = new mongoose.Schema({
  copy:        { type: mongoose.Schema.Types.ObjectId, ref: 'Copy', required: true },
  pageNumber:  { type: Number, required: true },
  raisedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:        { type: String, required: true },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  response:    String,
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Query', QuerySchema);
