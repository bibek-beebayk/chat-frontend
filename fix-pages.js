const fs = require('fs');

// Fix chat/page.tsx
let c = fs.readFileSync('src/app/chat/page.tsx', 'utf8');
c = c.replace(/import\s*\{\s*Header\s*\}\s*from\s*['"]@\/components\/layout\/Header['"];?/, "import { DashboardLayout } from '@/components/layout/DashboardLayout';");
c = c.replace(/<div className=\{styles\.pageWrapper\}>\s*<Header \/>\s*<main className=\{styles\.main\}>/g, '<DashboardLayout hideSidebar><main className={styles.main}>');
c = c.replace(/<\/main>\s*<\/div>/g, '</main></DashboardLayout>');
fs.writeFileSync('src/app/chat/page.tsx', c);

// Fix staff-dashboard/page.tsx
let s = fs.readFileSync('src/app/staff-dashboard/page.tsx', 'utf8');
s = s.replace(/import\s*\{\s*Header\s*\}\s*from\s*['"]@\/components\/layout\/Header['"];?/, "import { DashboardLayout } from '@/components/layout/DashboardLayout';");
s = s.replace(/<div className=\{styles\.pageWrap\}>\s*<Header \/>\s*<main className=\{styles\.main\}>/g, '<DashboardLayout><main className={styles.main}>');
s = s.replace(/<\/main>\s*<\/div>/g, '</main></DashboardLayout>');
fs.writeFileSync('src/app/staff-dashboard/page.tsx', s);
