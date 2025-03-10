//local version...
/*const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const app = express();

// Configure multer to store uploads in a temporary folder
const upload = multer({ dest: 'uploads/' });
const folderUpload = upload.array('repoFolder');

app.use(express.urlencoded({ extended: true }));

// Global in-memory storage for folder uploads
const folderStorage = {};

// Helper function for ZIP extraction using JSZip.
async function extractZip(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = new JSZip();
  const contents = await zip.loadAsync(fileBuffer);
  const files = {};
  for (const [relativePath, fileObj] of Object.entries(contents.files)) {
    if (!fileObj.dir) { // Ignore directories
      files[relativePath] = await fileObj.async("nodebuffer");
    }
  }
  return files;
}

// Helper function to compute a file summary (extension counts)
function computeFileSummary(filesObj) {
  const summary = {};
  for (const entryName in filesObj) {
    if (filesObj.hasOwnProperty(entryName)) {
      const ext = path.extname(entryName).toLowerCase() || '(no extension)';
      summary[ext] = (summary[ext] || 0) + 1;
    }
  }
  return summary;
}

// Helper function to compute a mapping of extensions to file names
function computeFilesMapping(filesObj) {
  const mapping = {};
  for (const entryName in filesObj) {
    if (filesObj.hasOwnProperty(entryName)) {
      const ext = path.extname(entryName).toLowerCase() || '(no extension)';
      if (!mapping[ext]) {
        mapping[ext] = [];
      }
      mapping[ext].push(entryName);
    }
  }
  return mapping;
}

// GET / - Homepage with two upload forms: ZIP and Folder.
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Upload Codebase</title>
        <style>
          body { 
            font-family: sans-serif; 
            background-color: #121212; 
            color: #e0e0e0; 
            padding: 40px; 
          }
          h1, h2 { color: #ffffff; text-align: center; }
          form { 
            margin: 20px auto; 
            padding: 20px; 
            border: 1px solid #333; 
            background-color: #1e1e1e; 
            border-radius: 5px;
            width: 80%;
            text-align: center;
          }
          input, button { 
            padding: 10px; 
            margin-top: 10px;
            border: 1px solid #333;
            border-radius: 3px;
            background-color: #2c2c2c;
            color: #e0e0e0;
          }
          button { cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Upload Your Codebase</h1>
        <h2>Upload a ZIP file</h2>
        <form action="/upload" method="post" enctype="multipart/form-data">
          <label>Select Zip File:</label>
          <input type="file" name="repoZip" accept=".zip" required /><br/>
          <button type="submit">Upload ZIP</button>
        </form>
        <h2>Upload a Code Folder</h2>
        <form action="/upload-folder" method="post" enctype="multipart/form-data">
          <label>Select Folder:</label>
          <input type="file" name="repoFolder" webkitdirectory directory multiple required /><br/>
          <button type="submit">Upload Folder</button>
        </form>
      </body>
    </html>
  `);
});

//
// ZIP Upload Flow
//
app.post('/upload', upload.single('repoZip'), async (req, res) => {
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

//
// Folder Upload Flow
//
app.post('/upload-folder', folderUpload, (req, res) => {
  try {
    const filesObj = {};
    req.files.forEach(file => {
      const relativePath = file.webkitRelativePath || file.originalname;
      filesObj[relativePath] = file.path;
    });
    const fileSummary = computeFileSummary(filesObj);
    const extensions = Object.keys(fileSummary).filter(ext => ext !== '(no extension)').sort();
    const folderID = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    folderStorage[folderID] = filesObj;
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

//
// Aggregation for both ZIP and Folder uploads
//
app.post('/aggregate', async (req, res) => {
  try {
    const { uploadType } = req.body;
    let filesObj = {};
    let extensions = [];
    let fileSummary = {};
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
      if (!folderStorage[folderID]) {
        return res.status(400).send("Folder upload session expired or invalid.");
      }
      filesObj = folderStorage[folderID];
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
        aggregatedCode += `\n\n/* File path: ${entryName} *//*\n${fileContent}`;
      }
    }
    fileSummary = computeFileSummary(filesObj);
    extensions = Object.keys(fileSummary).filter(ext => ext !== '(no extension)').sort();
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

//
// Helper function to render the two‑column selection page.
//
function renderSelectionPage({ uploadType, filePath = '', folderID = '', extensions, selected, aggregatedCode = '', fileSummary = {}, filesMapping = {} }) {
    // Build file summary HTML (just a list, for the options area)
    let summaryHTML = '<h3>File Summary</h3><ul style="list-style: none; padding-left: 0;">';
    for (const ext in fileSummary) {
      summaryHTML += `<li style="margin-bottom: 5px;">${ext}: ${fileSummary[ext]}</li>`;
    }
    summaryHTML += '</ul>';
  
    // Build checkboxes for file extensions (no inline file list here)
    let checkboxHTML = '';
    extensions.forEach(ext => {
      const isChecked = selected.includes(ext) ? 'checked' : '';
      checkboxHTML += `<label style="display:block; margin-bottom:5px; text-align: center;">
                         <input type="checkbox" name="extensions" value="${ext}" ${isChecked} style="margin-right:5px;"/> ${ext}
                       </label>`;
    });
  
    // Build hidden fields based on uploadType
    let hiddenFields = `<input type="hidden" name="uploadType" value="${uploadType}" />`;
    if (uploadType === 'zip') {
      hiddenFields += `<input type="hidden" name="filePath" value="${filePath}" />`;
    } else if (uploadType === 'folder') {
      hiddenFields += `<input type="hidden" name="folderID" value="${folderID}" />`;
    }
  
    // Header for aggregated code (Copy/Download buttons remain unchanged)
    const codeHeader = aggregatedCode.trim() !== '' ? `
      <div class="code-header">
        <button type="button" onclick="copyCode()">Copy Code</button>
        <button type="button" onclick="downloadCode()">Download TXT</button>
      </div>
    ` : '';
  
    // Script to handle Copy/Download and dynamic file list updates.
    // This script will update a separate "filesContainer" div (scrollable) that is below the options.
    const script = `
      <script>
        const filesMapping = ${JSON.stringify(filesMapping)};
        function updateFileLists() {
          const container = document.getElementById('filesContainer');
          let html = '';
          document.querySelectorAll('input[name="extensions"]').forEach(cb => {
            if (cb.checked) {
              let ext = cb.value;
              const files = filesMapping[ext] || [];
              html += '<div style="margin-bottom:10px;"><strong>' + ext + '</strong><ul style="padding-left: 20px; text-align: left;">' +
                      files.map(name => '<li>' + name + '</li>').join('') + '</ul></div>';
            }
          });
          container.innerHTML = html;
        }
        document.querySelectorAll('input[name="extensions"]').forEach(cb => {
          cb.addEventListener('change', updateFileLists);
        });
        updateFileLists();
        
        function copyCode() {
          const code = document.getElementById('aggregatedCode').innerText;
          navigator.clipboard.writeText(code).then(() => {
            alert('Code copied to clipboard!');
          });
        }
        function downloadCode() {
          const code = document.getElementById('aggregatedCode').innerText;
          const blob = new Blob([code], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'aggregated_code.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
      </script>
    `;
  
    return `
      <html>
        <head>
          <title>Code Aggregator</title>
          <style>
            body { 
              font-family: sans-serif; 
              margin: 20px; 
              padding: 20px;
              background-color: #121212; 
              color: #e0e0e0;
            }
            .container { 
              display: flex; 
              height: calc(100vh - 80px); 
              border: 2px solid #333; 
              border-radius: 10px;
            }
            .sidebar { 
              width: 25%; 
              padding: 20px; 
              background-color: #1e1e1e; 
              box-sizing: border-box; 
              border-right: 2px solid #333;
            }
            .options-container { 
              text-align: center;
            }
            .files-container { 
              margin-top: 15px; 
              max-height: 200px; 
              overflow-y: auto; 
              border-top: 1px solid #333; 
              padding-top: 10px;
            }
            .content { 
              flex: 1; 
              padding: 20px; 
              background-color: #181818; 
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .code-header {
              text-align: center;
              margin-bottom: 10px;
            }
            .code-header button { 
              padding: 8px 12px; 
              border: 1px solid #333; 
              background-color: #2c2c2c; 
              color: #e0e0e0; 
              border-radius: 3px; 
              cursor: pointer;
              margin: 0 5px;
            }
            .code-box {
              flex: 1;
              overflow-y: auto;
              border: 1px solid #333; 
              border-radius: 5px;
              background-color: #2c2c2c;
              padding: 15px;
              text-align: left;
              max-height: 400px;
            }
            pre { 
              white-space: pre-wrap;
            }
            form { margin-bottom: 20px; }
            button { 
              padding: 8px 12px; 
              border: 1px solid #333; 
              background-color: #2c2c2c; 
              color: #e0e0e0; 
              border-radius: 3px; 
              cursor: pointer;
              margin: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="sidebar">
              <h2 style="text-align: center;">File Extensions</h2>
              <div class="options-container">
                ${summaryHTML}
                <form action="/aggregate" method="post" id="optionsForm">
                  ${checkboxHTML}
                  ${hiddenFields}
                  <div style="margin-top: 15px;">
                    <button type="submit">Aggregate Code</button>
                  </div>
                </form>
              </div>
              <div class="files-container" id="filesContainer">
                <!-- File names for selected extensions will appear here -->
              </div>
              <p style="text-align: center; margin-top: 10px;">Select the file extensions to include in the aggregated result.</p>
            </div>
            <div class="content">
              <h2 style="text-align: center;">Aggregated Code</h2>
              <div class="code-header">
                <button type="button" onclick="copyCode()">Copy Code</button>
                <button type="button" onclick="downloadCode()">Download TXT</button>
              </div>
              <div class="code-box">
                <pre id="aggregatedCode">${aggregatedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
              </div>
            </div>
          </div>
          ${script}
        </body>
      </html>
    `;
  }
  

// Start the server on port 3000 (or your specified port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
*/
