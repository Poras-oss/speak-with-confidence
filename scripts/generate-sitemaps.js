import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.VITE_APP_URL || 'https://voxmind.space';
const URLS_PER_SITEMAP = 40000;

const dataPath = path.resolve(process.cwd(), 'public', 'pseo-data.json');
const publicDir = path.resolve(process.cwd(), 'public');

if (!fs.existsSync(dataPath)) {
  console.error('Error: public/pseo-data.json not found. Run generate-pseo-dataset.js first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const slugs = data.map(item => item.slug);

console.log(`Generating sitemaps for ${slugs.length} URLs...`);

let sitemapCount = 0;

for (let i = 0; i < slugs.length; i += URLS_PER_SITEMAP) {
  sitemapCount++;
  const chunk = slugs.slice(i, i + URLS_PER_SITEMAP);
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  for (const slug of chunk) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/blog/${slug}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }
  
  xml += `</urlset>`;
  
  const sitemapPath = path.join(publicDir, `sitemap-${sitemapCount}.xml`);
  fs.writeFileSync(sitemapPath, xml);
  console.log(`Saved ${sitemapPath}`);
}

// Generate sitemap index
let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
indexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

for (let i = 1; i <= sitemapCount; i++) {
  indexXml += `  <sitemap>\n`;
  indexXml += `    <loc>${BASE_URL}/sitemap-${i}.xml</loc>\n`;
  indexXml += `  </sitemap>\n`;
}

indexXml += `</sitemapindex>`;

const indexPath = path.join(publicDir, 'sitemap.xml'); // or sitemap-index.xml
fs.writeFileSync(indexPath, indexXml);
console.log(`Saved sitemap index to ${indexPath}`);
