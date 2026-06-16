const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('page.tsx')) results.push(file);
        }
    });
    return results;
}

const authPages = ['login', 'register', 'onboarding', 'set-password', 'verify-otp', 'test-email'];

const pages = walk('src/app');
pages.forEach(p => {
    // Skip auth pages
    if (authPages.some(auth => p.includes(auth))) return;

    let content = fs.readFileSync(p, 'utf8');
    let original = content;

    // Replace Header imports
    content = content.replace(/import\s+\{\s*Header\s*\}\s+from\s+['"]@\/components\/layout\/Header['"];?/g, "import { DashboardLayout } from '@/components/layout/DashboardLayout';");
    
    // Replace <Header /> and <div className={styles.pageWrap}> with <DashboardLayout>
    // First, remove <Header />
    content = content.replace(/<Header\s*\/>/g, '');
    
    // Then replace <div className={styles.pageWrap}> with <DashboardLayout>
    content = content.replace(/<div\s+className=\{styles\.pageWrap\}>/g, '<DashboardLayout>');
    
    // Count open/close DashboardLayout tags
    const openCount = (content.match(/<DashboardLayout[^>]*>/g) || []).length;
    let closeCount = (content.match(/<\/DashboardLayout>/g) || []).length;
    
    // If we have unclosed DashboardLayouts, try to replace the matching closing </div>
    // The easiest way is to find the last </div> before the final `); }` 
    // or just find instances of `</div>\n        );\n    }`
    if (openCount > closeCount) {
        // A very common pattern:
        //             </div>
        //         );
        //     }
        // AND
        //         </div>
        //     );
        // }
        // We can just use a regex to replace the last </div> in a return block
        
        let lines = content.split('\n');
        for (let i = lines.length - 1; i >= 0; i--) {
            if (openCount <= closeCount) break;
            if (lines[i].includes('</div>')) {
                lines[i] = lines[i].replace('</div>', '</DashboardLayout>');
                closeCount++;
            }
        }
        content = lines.join('\n');
    }
    
    if (content !== original) {
        fs.writeFileSync(p, content);
        console.log('Migrated layout for ' + p);
    }
});
