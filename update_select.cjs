const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

const generateSelectOptions = `
      let categoryOptionsHtml = '<option value="" disabled selected>Pilih Nomor</option>';
      if (window.masterCategories && window.masterCategories.length > 0) {
        window.masterCategories.forEach(cat => {
          categoryOptionsHtml += \\\`<option value="\\\${cat.name}">\\\${cat.name}</option>\\\`;
        });
      }
`;

const targetRegex2 = /newRow\.innerHTML = \`\s*<div class="col-span-5"><input type="text" list="list-nomor-renang" placeholder="Ketik\/Pilih Nomor" \r?\nclass="input-kategori[^>]+><\/div>/g;
const replacement2 = `
      let categoryOptionsHtml = '<option value="" disabled selected>Pilih Nomor</option>';
      if (window.masterCategories && window.masterCategories.length > 0) {
        window.masterCategories.forEach(cat => {
          categoryOptionsHtml += \\\`<option value="\\\${cat.name}">\\\${cat.name}</option>\\\`;
        });
      }
      
      newRow.innerHTML = \\\`
        <div class="col-span-5">
          <select class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none appearance-none cursor-pointer">
            \\\${categoryOptionsHtml}
          </select>
        </div>`;
code = code.replace(targetRegex2, replacement2);

const targetRegex3 = /newRow\.innerHTML = \`\s*<div class="col-span-5">\s*<input type="text" list="list-nomor-renang" value="\$\{res\.category\}" placeholder="Ketik\/Pilih Nomor" \r?\nclass="input-kategori[^>]+>\s*<\/div>/g;
const replacement3 = `
          let categoryOptionsHtml = '<option value="" disabled>Pilih Nomor</option>';
          if (window.masterCategories && window.masterCategories.length > 0) {
            window.masterCategories.forEach(cat => {
              categoryOptionsHtml += \\\`<option value="\\\${cat.name}" \\\${res.category === cat.name ? 'selected' : ''}>\\\${cat.name}</option>\\\`;
            });
          }

          newRow.innerHTML = \\\`
            <div class="col-span-5">
              <select class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none appearance-none cursor-pointer">
                \\\${categoryOptionsHtml}
              </select>
            </div>`;
code = code.replace(targetRegex3, replacement3);

fs.writeFileSync('src/main.js', code);
