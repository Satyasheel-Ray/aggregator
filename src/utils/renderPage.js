function renderSelectionPage({ uploadType, filePath = '', folderID = '', extensions, selected, aggregatedCode = '', fileSummary = {}, filesMapping = {} }) {
    // Build file summary HTML
    let summaryHTML = '<h3>File Summary</h3><ul style="list-style: none; padding-left: 0;">';
    for (const ext in fileSummary) {
      summaryHTML += `<li style="margin-bottom: 5px;">${ext}: ${fileSummary[ext]}</li>`;
    }
    summaryHTML += '</ul>';
  
    // Build checkboxes for file extensions
    let checkboxHTML = '';
    extensions.forEach(ext => {
      const isChecked = selected.includes(ext) ? 'checked' : '';
      checkboxHTML += `<label style="display:block; margin-bottom:5px; text-align: center;">
                         <input type="checkbox" name="extensions" value="${ext}" ${isChecked} style="margin-right:5px;"/> ${ext}
                       </label>`;
    });
  
    // Hidden fields for upload type
    let hiddenFields = `<input type="hidden" name="uploadType" value="${uploadType}" />`;
    if (uploadType === 'zip') {
      hiddenFields += `<input type="hidden" name="filePath" value="${filePath}" />`;
    } else if (uploadType === 'folder') {
      hiddenFields += `<input type="hidden" name="folderID" value="${folderID}" />`;
    }
  
    // Code header with copy & download buttons
    const codeHeader = aggregatedCode.trim() !== '' ? `
      <div class="code-header">
        <button type="button" onclick="copyCode()">Copy Code</button>
        <button type="button" onclick="downloadCode()">Download TXT</button>
      </div>
    ` : '';
  
    // Script for dynamic file list and copy/download functionality
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
            .options-container { text-align: center; }
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
            pre { white-space: pre-wrap; }
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
                <!-- Dynamic file names appear here -->
              </div>
              <p style="text-align: center; margin-top: 10px;">Select the file extensions to include.</p>
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
  
  module.exports = { renderSelectionPage };
  