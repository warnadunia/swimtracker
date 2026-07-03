const fs = require('fs');
const oldContent = fs.readFileSync('src/main_old_utf8.js', 'utf8').split('\n');
const newContent = fs.readFileSync('src/main.js', 'utf8').split('\n');

// Find the line in oldContent that starts with "// ==========================================" and "// 2. LOGIC FETCHING HISTORY & MEDALI"
let startIdx = 65; // line 66 (0-indexed)
// The end is before the last `});`
let endIdx = oldContent.length - 2;

const appendedBlock = oldContent.slice(startIdx, endIdx).join('\n');

// Find the insertion point in main.js
let insertIdx = newContent.findIndex(line => line.includes('// Di sini nanti kita letakkan kembali fungsi `loadData()`'));
if (insertIdx === -1) {
    insertIdx = newContent.length - 2; // Before closing });
}

newContent.splice(insertIdx, 2, appendedBlock); // Replace the two lines of comments

fs.writeFileSync('src/main.js', newContent.join('\n'));
console.log('Appended logic to main.js');
