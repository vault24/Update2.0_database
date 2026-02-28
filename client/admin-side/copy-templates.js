import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, 'src', 'documents', 'templates');
const targetDir = join(__dirname, 'public', 'templates');

// Create target directory if it doesn't exist
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

// List of files to copy
const files = [
  'Certificate.html',
  'characterCertificate.html',
  'CourseCompletionCertificate.html',
  'EligibilityStatement.html',
  'gov.svg',
  'IdCard.html',
  'Prottayon.html',
  'Sallu_certificate.html',
  'spi.png',
  'Testimonial.html'
];

// Copy each file
files.forEach(file => {
  const source = join(sourceDir, file);
  const target = join(targetDir, file);
  try {
    copyFileSync(source, target);
    console.log(`Copied ${file} to public/templates/`);
  } catch (error) {
    console.error(`Failed to copy ${file}:`, error.message);
  }
});

console.log('Template files copied successfully!');
