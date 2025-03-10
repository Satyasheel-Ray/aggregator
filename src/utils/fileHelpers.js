const fs = require('fs');
const JSZip = require('jszip');
const path = require('path');

async function extractZip(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const zip = new JSZip();
  const contents = await zip.loadAsync(fileBuffer);
  const files = {};
  for (const [relativePath, fileObj] of Object.entries(contents.files)) {
    if (!fileObj.dir) {
      files[relativePath] = await fileObj.async("nodebuffer");
    }
  }
  return files;
}

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

module.exports = { extractZip, computeFileSummary, computeFilesMapping };
