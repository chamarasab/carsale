/**
 * Returns true when MongoDB Atlas rejects a write because the cluster exceeded its storage quota.
 */
export function isMongoStorageQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const mongoError = error as { code?: number; codeName?: string; message?: string };
  return (
    mongoError.code === 8000
    || mongoError.codeName === 'AtlasError'
    || (typeof mongoError.message === 'string' && /space quota|writes are blocked/i.test(mongoError.message))
  );
}
