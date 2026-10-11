import fs from 'fs';
import path from 'path';

const PREVIEW_DIR = path.resolve(process.cwd(), 'tmp', 'email-previews');
const TEMPLATES_DIR = path.resolve(process.cwd(), 'supabase', 'templates');

if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

const sampleEmail = 'student.uniosun@gmail.com';
const sampleConfirmUrl = 'https://dormiqa.com/auth/confirmed?token_hash=sample_signup_token_12345&type=signup';
const sampleResetUrl = 'https://dormiqa.com/auth/reset-password#access_token=sample_recovery_token_67890&type=recovery';

function renderFile(templateName: string, outputFile: string, replacements: Record<string, string>) {
  const filePath = path.join(TEMPLATES_DIR, templateName);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(`\\{\\{\\s*\\${key}\\s*\\}\\}`, 'g');
    content = content.replace(regex, val);
  }
  const outPath = path.join(PREVIEW_DIR, outputFile);
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`✓ Rendered preview: tmp/email-previews/${outputFile}`);
}

console.log('Generating Dormiqa email template previews...');

// 1. Confirm signup
renderFile('confirm-signup.html', 'confirm-signup.preview.html', {
  '.Email': sampleEmail,
  '.ConfirmationURL': sampleConfirmUrl
});
renderFile('confirm-signup.txt', 'confirm-signup.preview.txt', {
  '.Email': sampleEmail,
  '.ConfirmationURL': sampleConfirmUrl
});

// 2. Reset password
renderFile('reset-password.html', 'reset-password.preview.html', {
  '.Email': sampleEmail,
  '.ConfirmationURL': sampleResetUrl
});
renderFile('reset-password.txt', 'reset-password.preview.txt', {
  '.Email': sampleEmail,
  '.ConfirmationURL': sampleResetUrl
});

// 3. Password changed
renderFile('password-changed.html', 'password-changed.preview.html', {
  '.Email': sampleEmail
});
renderFile('password-changed.txt', 'password-changed.preview.txt', {
  '.Email': sampleEmail
});

console.log('\nAll email previews successfully created in tmp/email-previews/ !');
