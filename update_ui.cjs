const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

const targetRegex = /const top2 = sortedResults\.slice\(0, 2\);[\s\S]*?<\/div>\n          <\/div>`;/g;

const replacement = `const top2 = sortedResults.slice(0, 2);
        const rest = sortedResults.slice(2);
        
        const renderRow = (res) => {
          return \`
            <div class="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
              <span class="text-gray-700 dark:text-gray-300 font-medium text-[11px] w-1/2 truncate">\${res.category}</span>
              <span class="font-mono text-brand-red font-bold text-[11px] w-1/4 text-center">\${res.time_record || '-'}</span>
              <span class="text-gray-500 dark:text-gray-400 text-[10px] w-1/4 text-right">rank \${res.rank || '-'}</span>
            </div>
          \`;
        };

        let top2Html = top2.map(renderRow).join('');
        let fullListHtml = rest.map(renderRow).join('');

        htmlString += \`
          <div class="bg-white dark:bg-brand-card rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-3">
            <div class="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" onclick="toggleExpand(this)">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-bold text-sm text-gray-800 dark:text-white">\${ev.title}</h4>
                  <p class="text-[10px] text-gray-500">\${ev.level} • \${dateStr}</p>
                </div>
                <div class="flex items-center gap-3">
                  <!-- TOMBOL EDIT -->
                  <button type="button" class="text-brand-red hover:text-red-400 transition-colors p-1" onclick="event.stopPropagation(); openEditModal('\${ev.id}')" title="Edit Data">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  </button>
                  <svg class="w-5 h-5 text-gray-400 transform transition-transform icon-expand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <hr class="border-gray-100 dark:border-gray-700 mb-2 mt-1">
              <div class="flex flex-col w-full">\${top2Html || '<span class="text-[10px] text-gray-400">Belum ada data nomor</span>'}</div>
            </div>
            \${fullListHtml ? \`
            <div class="px-4 pb-4 hidden content-expand">
              <div class="flex flex-col w-full">\${fullListHtml}</div>
            </div>\` : ''}
          </div>\`;`;

code = code.replace(targetRegex, replacement);
fs.writeFileSync('src/main.js', code);
