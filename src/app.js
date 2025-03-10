const express = require('express');
const multer = require('multer');
const path = require('path');

// Set up multer to store uploads in /tmp for Vercel serverless functions
const upload = multer({ dest: '/tmp/uploads' });
const folderUpload = upload.array('repoFolder');

const app = express();
app.use(express.urlencoded({ extended: true }));

// In-memory storage for folder uploads (temporary)
app.locals.folderStorage = {};

// Import and register routes
const aggregatorRoutes = require('./routes/aggregator');
app.use('/', aggregatorRoutes);

module.exports = app;
