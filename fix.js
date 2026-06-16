const fs = require('fs');
const files = [
  'src/app/events/[id]/page.tsx',
  'src/app/feed/page.tsx',
  'src/app/staff-dashboard/page.tsx',
  'src/app/test-email/page.tsx'
];
files.forEach(f => {
  try {
    let text = fs.readFileSync(f, 'utf8');
    text = text.replace(/import \{ Header \} from '@\/components\/layout\/Header';/g, "import { DashboardLayout } from '@/components/layout/DashboardLayout';");
    text = text.replace(/<div className=\{styles\.pageWrap\}>\s*<Header \/>/g, '<DashboardLayout>');
    text = text.replace(/<\/div>\s*$/g, '</DashboardLayout>');
    text = text.replace(/<\/div>\s*;\s*}/g, '</DashboardLayout>\n    );\n}');
    fs.writeFileSync(f, text);
    console.log('Migrated ' + f);
  } catch(e) {
    console.error(e);
  }
});
