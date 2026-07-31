const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync, statSync } = require('node:fs');

const checks = [
  {
    label: 'credential-bearing MongoDB URI',
    pattern: /mongodb(?:\+srv)?:\/\/[^:/\s]+:[^@\s/]+@/i,
  },
  {
    label: 'private key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    label: 'Google OAuth client secret',
    pattern: /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/,
  },
];

const candidateFiles = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  encoding: 'utf8',
}).split('\0').filter(Boolean);

const findings = [];
for (const path of candidateFiles) {
  if (!existsSync(path) || path.endsWith('.env.example')) continue;
  const size = statSync(path).size;
  if (size === 0 || size > 2 * 1024 * 1024) continue;

  const content = readFileSync(path);
  if (content.includes(0)) continue;
  const text = content.toString('utf8');

  for (const check of checks) {
    if (check.pattern.test(text)) findings.push(`${path}: ${check.label}`);
  }
}

if (findings.length) {
  console.error('Potential secrets found in tracked files:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed (${candidateFiles.length} version-controlled files checked).`);
