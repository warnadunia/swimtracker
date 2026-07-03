const fs = require('fs');
let code = fs.readFileSync('src/main.js', 'utf8');

const str1 = `        <div class="col-span-5"><input type="text" list="list-nomor-renang" placeholder="Ketik/Pilih Nomor" class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none"></div>`;

const rep1 = `      \${(function(){
        let opts = '<option value="" disabled selected>Pilih Nomor</option>';
        if (window.masterCategories && window.masterCategories.length > 0) {
          window.masterCategories.forEach(cat => opts += \`<option value="\${cat.name}">\${cat.name}</option>\`);
        }
        return \`<div class="col-span-5"><select class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none appearance-none cursor-pointer">\${opts}</select></div>\`;
      })()} `;

const str2 = `            <div class="col-span-5">
              <input type="text" list="list-nomor-renang" value="\${res.category}" placeholder="Ketik/Pilih Nomor" class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none">
            </div>`;

const rep2 = `            <div class="col-span-5">
              \${(function(){
                let opts = '<option value="" disabled>Pilih Nomor</option>';
                if (window.masterCategories && window.masterCategories.length > 0) {
                  window.masterCategories.forEach(cat => opts += \`<option value="\${cat.name}" \${res.category === cat.name ? 'selected' : ''}>\${cat.name}</option>\`);
                }
                return \`<select class="input-kategori w-full px-2 py-1.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-gray-600 rounded text-[10px] sm:text-xs focus:border-brand-red outline-none appearance-none cursor-pointer">\${opts}</select>\`;
              })()}
            </div>`;

if (code.includes(str1)) {
    code = code.replace(str1, rep1);
} else {
    console.log("String 1 not found");
}
if (code.includes(str2)) {
    code = code.replace(str2, rep2);
} else {
    console.log("String 2 not found");
}

fs.writeFileSync('src/main.js', code);
