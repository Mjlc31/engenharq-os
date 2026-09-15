const fs = require('fs');
let code = fs.readFileSync('src/pages/WorkerProfile.tsx', 'utf-8');

const target = `<table className="w-full text-left text-sm whitespace-nowrap">`;
const replacement = `<div className="overflow-x-auto">\n              <table className="w-full text-left text-sm whitespace-nowrap">`;

if (!code.includes(replacement)) {
    code = code.replace(target, replacement);
    code = code.replace(
        `</tbody>\n              </table>`,
        `</tbody>\n              </table>\n              </div>`
    );
    fs.writeFileSync('src/pages/WorkerProfile.tsx', code);
}
