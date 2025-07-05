// controllers/student.controller.js
const Copy = require('../models/Copy');
const Query = require('../models/Query');
const User = require('../models/User'); // Assuming you have a User model

exports.listCopies = async (req, res, next) => {
    try {
        // Students can only see copies that are completed AND released by admin
        const copies = await Copy.find({
            student: req.user._id,
            status: 'completed',
            isReleasedToStudent: true // NEW: Filter by release status
        })
        .populate('questionPaper'); // Do NOT populate examiners here for student anonymity
        res.json(copies);
    } catch (err) {
        next(err);
    }
};

exports.getCopy = async (req, res, next) => {
    try {
        const copy = await Copy.findById(req.params.id)
            .populate('questionPaper'); // Do NOT populate examiners here for student anonymity
        // Ensure the copy belongs to the student requesting it
        if (!copy || copy.student.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Copy not found or unauthorized.' });
        }
        // Ensure the copy is released to the student
        if (!copy.isReleasedToStudent) {
            return res.status(403).json({ message: 'This copy has not been released yet.' });
        }
        res.json(copy);
    } catch (err) {
        next(err);
    }
};

exports.raiseQuery = async (req, res, next) => {
    try {
        const { pageNumber, text } = req.body;
        const copy = await Copy.findById(req.params.id);

        if (!copy || copy.student.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Copy not found or unauthorized.' });
        }

        const q = new Query({
            copy: req.params.id,
            pageNumber,
            text,
            raisedBy: req.user._id,
            status: 'pending' // Default status for new queries
        });
        await q.save();

        // Optionally, populate the query for a richer response
        const newQuery = await Query.findById(q._id)
            .populate('raisedBy', 'email name')
            .populate({
                path: 'copy',
                select: 'questionPaper', // Only need QP title for context
                populate: {
                    path: 'questionPaper',
                    select: 'title'
                }
            });

        res.status(201).json(newQuery);
    } catch (err) {
        next(err);
    }
};