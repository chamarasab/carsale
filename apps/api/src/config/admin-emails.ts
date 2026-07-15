import { ConfigService } from '@nestjs/config';

const APPROVED_ADMIN_EMAILS = ['aselawhatsapp@gmail.com'];

export function getAdminEmails(config: ConfigService) {
  const configured = config
    .get<string>('ADMIN_EMAILS', '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...configured, ...APPROVED_ADMIN_EMAILS])];
}
