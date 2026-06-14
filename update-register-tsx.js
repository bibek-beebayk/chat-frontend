const fs = require('fs');

const loginTsx = fs.readFileSync('src/app/login/page.tsx', 'utf8');
const registerTsx = fs.readFileSync('src/app/register/page.tsx', 'utf8');

const layoutHeaderMatch = loginTsx.match(/<div className=\{styles\.container\}>([\s\S]*?)<form/);
let newHeader = layoutHeaderMatch[1];
newHeader = newHeader.replace('<h2>Welcome Back! 👋</h2>', '<h2>Create Account 🚀</h2>');
newHeader = newHeader.replace('<p>Login to continue to Rollin Community</p>', '<p>Join Rollin Community today!</p>');

const formMatch = registerTsx.match(/<form[\s\S]*?<\/form>/);
const newForm = formMatch[0];

const layoutFooterMatch = loginTsx.match(/<\/form>([\s\S]*?)<\/div>\s*\n\s*\);\s*\n\}/);
let newFooter = layoutFooterMatch[1];

const newReturn = `    return (
        <div className={styles.container}>
${newHeader}
                ${newForm}
${newFooter}
        </div>
    );
}`;

const newRegisterTsx = registerTsx.replace(/return \([\s\S]*?\);\s*\n\}/, newReturn);
fs.writeFileSync('src/app/register/page.tsx', newRegisterTsx);
console.log('Done TSX');
