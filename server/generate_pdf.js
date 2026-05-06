
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('PDF generation starting...');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Load HTML from parent dir
  const htmlPath = path.join(__dirname, '..', 'hospital_analysis.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  const pdfPath = path.join(__dirname, '..', 'hospital_analysis.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
  });
  
  await browser.close();
  
  console.log(`✅ PDF generated: ${pdfPath}`);
})();

