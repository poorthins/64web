/**
 * Generate test fixture files for E2E tests
 * Run with: node tests/e2e/fixtures/generate-fixtures.js
 */

const fs = require('fs');
const path = require('path');

const fixturesDir = __dirname;

console.log('Generating test fixtures...');

// Create a simple "PDF" file (actually just a text file with .pdf extension)
// For real testing, you should use actual PDF files
const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Evidence Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

const pdfPath = path.join(fixturesDir, 'test-evidence.pdf');
fs.writeFileSync(pdfPath, pdfContent, 'utf8');
console.log(`✓ Created ${pdfPath}`);

// Create a minimal JPG file (1x1 pixel red square)
// This is a valid JPEG file in base64
const jpegBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA';
const jpegBuffer = Buffer.from(jpegBase64, 'base64');

const jpegPath = path.join(fixturesDir, 'test-image.jpg');
fs.writeFileSync(jpegPath, jpegBuffer);
console.log(`✓ Created ${jpegPath}`);

// Create a PNG file (1x1 pixel transparent)
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

const pngPath = path.join(fixturesDir, 'test-image.png');
fs.writeFileSync(pngPath, pngBuffer);
console.log(`✓ Created ${pngPath}`);

console.log('\nTest fixtures generated successfully!');
console.log('Note: These are minimal valid files for testing purposes.');
console.log('For production testing, consider using more realistic sample files.');
