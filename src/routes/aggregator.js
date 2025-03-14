const express = require('express');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const router = express.Router();
const { extractZip, computeFileSummary, computeFilesMapping } = require('../utils/fileHelpers');
const { renderSelectionPage } = require('../utils/renderPage');

const upload = require('multer')({ dest: '/tmp/uploads' });
const folderUpload = upload.array('repoFolder');

// GET / - Render upload forms

router.get('/', (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Upload Codebase</title>
          <style>
            body {
              font-family: sans-serif;
              background-color: #121212;
              color: #e0e0e0;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background-color: #1e1e1e;
              border: 2px solid #333;
              border-radius: 5px;
              padding: 20px;
            }
            h1, h2 {
              text-align: center;
              margin-bottom: 20px;
            }
            form {
              margin-bottom: 30px;
              text-align: center;
            }
            label {
              display: block;
              margin: 10px 0;
            }
            input, button {
              background-color: #2c2c2c;
              border: 1px solid #333;
              color: #e0e0e0;
              border-radius: 3px;
              padding: 10px;
              margin-top: 10px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Upload Your Codebase</h1>
            
            <h2>Upload a ZIP file</h2>
            <form action="/upload" method="post" enctype="multipart/form-data">
              <label>Select Zip File:</label>
              <input type="file" name="repoZip" accept=".zip" required />
              <br/>
              <button type="submit">Upload ZIP</button>
            </form>
            
            <h2>Upload a Code Folder</h2>
            <form action="/upload-folder" method="post" enctype="multipart/form-data">
              <label>Select Folder:</label>
              <input type="file" name="repoFolder" webkitdirectory directory multiple required />
              <br/>
              <button type="submit">Upload Folder</button>
            </form>
          </div>
        </body>
      </html>
    `);
  });
// POST /upload - Handle ZIP file upload
router.post('/upload', upload.single('repoZip'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const zipContents = await extractZip(filePath);
    const fileSummary = computeFileSummary(zipContents);
    const extensions = Object.keys(fileSummary).filter(ext => ext !== '(no extension)').sort();
    const filesMapping = computeFilesMapping(zipContents);
    res.send(renderSelectionPage({
      uploadType: 'zip',
      filePath, 
      extensions, 
      selected: [], 
      aggregatedCode: '',
      fileSummary,
      filesMapping
    }));
  } catch (error) {
    res.status(500).send(`Error processing ZIP file: ${error.message}`);
  }
});

// POST /upload-folder - Handle folder upload
router.post('/upload-folder', folderUpload, (req, res) => {
  try {
    const filesObj = {};
    req.files.forEach(file => {
      const relativePath = file.webkitRelativePath || file.originalname;
      filesObj[relativePath] = file.path;
    });
    const fileSummary = computeFileSummary(filesObj);
    const extensions = Object.keys(fileSummary).filter(ext => ext !== '(no extension)').sort();
    // Save the mapping in app locals for persistence during the session
    const folderID = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    req.app.locals.folderStorage[folderID] = filesObj;
    const filesMapping = computeFilesMapping(filesObj);
    res.send(renderSelectionPage({
      uploadType: 'folder',
      folderID,
      extensions,
      selected: [],
      aggregatedCode: '',
      fileSummary,
      filesMapping
    }));
  } catch (error) {
    res.status(500).send(`Error processing folder upload: ${error.message}`);
  }
});

// POST /aggregate - Process the selected extensions and show aggregated code
router.post('/aggregate', async (req, res) => {
  try {
    const { uploadType } = req.body;
    let filesObj = {};
    let aggregatedCode = '';
    let selected = req.body.extensions || [];
    if (typeof selected === 'string') {
      selected = [selected];
    }
    if (uploadType === 'zip') {
      const filePath = req.body.filePath;
      filesObj = await extractZip(filePath);
    } else if (uploadType === 'folder') {
      const folderID = req.body.folderID;
      filesObj = req.app.locals.folderStorage[folderID];
      if (!filesObj) {
        return res.status(400).send("Folder upload session expired or invalid.");
      }
    }
    for (const entryName in filesObj) {
      if (filesObj.hasOwnProperty(entryName)) {
        const ext = path.extname(entryName).toLowerCase() || '(no extension)';
        if (selected.length > 0 && !selected.includes(ext)) continue;
        let fileContent = '';
        if (uploadType === 'zip') {
          fileContent = filesObj[entryName].toString('utf8');
        } else {
          fileContent = fs.readFileSync(filesObj[entryName], 'utf8');
        }
        aggregatedCode += `\n\n/* File path: ${entryName} */\n${fileContent}`;
      }
    }
    const fileSummary = computeFileSummary(filesObj);
    const extensions = Object.keys(fileSummary).filter(ext => ext !== '(no extension)').sort();
    const filesMapping = computeFilesMapping(filesObj);
    res.send(renderSelectionPage({
      uploadType: req.body.uploadType,
      filePath: req.body.filePath || '',
      folderID: req.body.folderID || '',
      extensions,
      selected,
      aggregatedCode,
      fileSummary,
      filesMapping
    }));
  } catch (error) {
    res.status(500).send(`Error aggregating code: ${error.message}`);
  }
});

module.exports = router;
