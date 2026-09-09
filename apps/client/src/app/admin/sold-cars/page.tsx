'use client';

import { ImagePlus, Images, LoaderCircle, Maximize2, Trash2, Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Nav } from '@/components/nav';
import { createCustomerHandover, deleteCustomerHandover } from '@/lib/admin-api';
import { getCustomerHandovers } from '@/lib/api';
import type { CustomerHandover } from '@/lib/types';

const maximumFileSize = 10 * 1024 * 1024;
type Notice = { tone: 'error' | 'success'; text: string };

export default function AdminSoldCarsPage() {
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [handovers, setHandovers] = useState<CustomerHandover[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadingHandovers, setLoadingHandovers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const isAdmin = session?.user.role === 'ADMIN';

  useEffect(() => {
    if (status === 'loading') return;
    if (!isAdmin) {
      setLoadingHandovers(false);
      return;
    }

    let cancelled = false;
    setLoadingHandovers(true);
    getCustomerHandovers({ throwOnError: true })
      .then((items) => {
        if (!cancelled) setHandovers(items);
      })
      .catch(() => {
        if (!cancelled) setNotice({ tone: 'error', text: 'Could not load sold car posts.' });
      })
      .finally(() => {
        if (!cancelled) setLoadingHandovers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, status]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function selectFile(file?: File) {
    setNotice(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice({ tone: 'error', text: 'Select a valid image file.' });
      return;
    }
    if (file.size > maximumFileSize) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice({
        tone: 'error',
        text: 'The selected image must be 10 MB or smaller.',
      });
      return;
    }
    setSelectedFile(file);
  }

  async function uploadHandover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || !session?.accessToken || !isAdmin) return;

    setUploading(true);
    setNotice(null);
    try {
      const handover = await createCustomerHandover(selectedFile, session.accessToken);
      setHandovers((current) => [handover, ...current]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNotice({ tone: 'success', text: 'Sold car post published.' });
    } catch {
      setNotice({
        tone: 'error',
        text: 'Could not upload this image. Try a JPG, PNG, WebP, HEIF, or AVIF file.',
      });
    } finally {
      setUploading(false);
    }
  }

  async function removeHandover(handover: CustomerHandover) {
    if (!session?.accessToken || !window.confirm('Delete this sold car post?')) return;

    setDeletingId(handover._id);
    setNotice(null);
    try {
      await deleteCustomerHandover(handover._id, session.accessToken);
      setHandovers((current) => current.filter((item) => item._id !== handover._id));
      setNotice({ tone: 'success', text: 'Sold car post deleted.' });
    } catch {
      setNotice({ tone: 'error', text: 'Could not delete this post.' });
    } finally {
      setDeletingId('');
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link className="text-sm font-black text-sub hover:text-signal" href="/admin">
            Back to admin panel
          </Link>
          <p className="mt-5 text-xs font-black uppercase tracking-wide text-signal">Customer handovers</p>
          <h1 className="mt-2 text-4xl font-black text-foreground">Sold car posts</h1>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {status !== 'authenticated' || !isAdmin ? (
          <div className="rounded-panel border border-line bg-surface p-6 shadow-soft">
            <h2 className="text-xl font-black text-foreground">Administrator access required</h2>
            <p className="mt-2 text-sm text-muted">Only an administrator can publish sold car posts.</p>
            <Link
              className="bg-brand-gradient mt-4 inline-flex rounded-panel px-4 py-3 text-sm font-black text-white"
              href="/login"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <div>
            {notice ? (
              <div
                className={`mb-5 border-l-4 p-4 text-sm font-bold ${notice.tone === 'error' ? 'border-red-500 bg-red-500/8 text-red-500' : 'border-signal bg-signal/8 text-sub'}`}
                role={notice.tone === 'error' ? 'alert' : 'status'}
              >
                {notice.text}
              </div>
            ) : null}

            <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
              <form
                className="rounded-panel border border-line bg-surface p-5 shadow-soft lg:sticky lg:top-24"
                onSubmit={uploadHandover}
              >
                <ImagePlus className="text-signal" size={26} />
                <h2 className="mt-3 text-xl font-black text-foreground">Upload handover image</h2>

                <label className="mt-5 block cursor-pointer rounded-panel border border-dashed border-line bg-field p-3 transition hover:border-signal">
                  <input
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => selectFile(event.target.files?.[0])}
                    ref={fileInputRef}
                    type="file"
                  />
                  {previewUrl ? (
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-panel bg-black/5">
                      <Image
                        alt="Selected sold car handover"
                        className="object-contain"
                        fill
                        sizes="300px"
                        src={previewUrl}
                        unoptimized
                      />
                    </span>
                  ) : (
                    <span className="grid aspect-[4/3] place-items-center text-center text-sm font-bold text-muted">
                      <span>
                        <Upload className="mx-auto mb-2 text-signal" size={24} />
                        Select image
                      </span>
                    </span>
                  )}
                </label>

                <button
                  className="bg-brand-gradient mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!selectedFile || uploading}
                  type="submit"
                >
                  {uploading ? <LoaderCircle className="animate-spin" size={18} /> : <Upload size={18} />}
                  {uploading ? 'Uploading...' : 'Publish image'}
                </button>
              </form>

              <section aria-labelledby="sold-car-posts-title" className="min-w-0">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-signal">Latest first</p>
                    <h2 className="mt-2 text-2xl font-black text-foreground" id="sold-car-posts-title">
                      Published images
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 text-sm font-black tabular-nums text-muted">
                    <Images size={18} />
                    {loadingHandovers ? '...' : handovers.length}
                  </span>
                </div>

                {loadingHandovers ? (
                  <div
                    aria-label="Loading sold car posts"
                    className="mt-5 overflow-hidden rounded-panel border border-line bg-surface"
                    role="status"
                  >
                    <span className="sr-only">Loading sold car posts...</span>
                    {[0, 1, 2].map((row) => (
                      <div
                        className="grid animate-pulse grid-cols-[80px_minmax(0,1fr)_40px] items-center gap-3 border-b border-line p-3 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)_190px_64px] sm:px-4"
                        key={row}
                      >
                        <div className="h-16 w-20 rounded-panel bg-field sm:h-[72px] sm:w-24" />
                        <div>
                          <div className="h-4 w-32 bg-field" />
                          <div className="mt-2 h-3 w-24 bg-field" />
                        </div>
                        <div className="hidden h-4 w-28 bg-field sm:block" />
                        <div className="ml-auto size-10 bg-field" />
                      </div>
                    ))}
                  </div>
                ) : handovers.length ? (
                  <div className="mt-5 overflow-hidden rounded-panel border border-line bg-surface shadow-soft">
                    <div className="hidden grid-cols-[112px_minmax(0,1fr)_190px_64px] gap-3 border-b border-line bg-field px-4 py-3 text-xs font-black uppercase tracking-wide text-muted sm:grid">
                      <span>Preview</span>
                      <span>Post</span>
                      <span>Published</span>
                      <span className="text-right">Action</span>
                    </div>
                    <div className="divide-y divide-line">
                      {handovers.map((handover) => (
                        <article
                          aria-busy={deletingId === handover._id}
                          className="grid grid-cols-[80px_minmax(0,1fr)_40px] items-center gap-3 p-3 transition sm:grid-cols-[112px_minmax(0,1fr)_190px_64px] sm:px-4"
                          key={handover._id}
                        >
                          <a
                            aria-label="Open full sold car image"
                            className="group relative block h-16 w-20 overflow-hidden rounded-panel bg-field focus:outline-none focus-visible:ring-2 focus-visible:ring-signal sm:h-[72px] sm:w-24"
                            href={handover.imageUrl}
                            rel="noreferrer"
                            target="_blank"
                            title="Open full image"
                          >
                            <Image
                              alt="Published customer handover"
                              className="object-cover transition-transform group-hover:scale-[1.03] motion-reduce:transition-none"
                              fill
                              sizes="96px"
                              src={handover.imageUrl}
                            />
                            <span className="absolute bottom-1 right-1 grid size-7 place-items-center rounded-full bg-black/65 text-white opacity-90">
                              <Maximize2 size={14} />
                            </span>
                          </a>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-foreground">Sold car image</p>
                            <p className="mt-1 text-xs font-bold text-muted sm:hidden">
                              {formatDate(handover.createdAt)}
                            </p>
                            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase text-signal">
                              <span className="size-1.5 rounded-full bg-signal" aria-hidden="true" />
                              Published
                            </span>
                          </div>

                          <time className="hidden text-sm font-bold text-muted sm:block" dateTime={handover.createdAt}>
                            {formatDate(handover.createdAt)}
                          </time>

                          <div className="flex justify-end">
                            <button
                              aria-label="Delete sold car post"
                              className="grid size-10 shrink-0 place-items-center rounded-panel border border-line text-signal transition hover:border-signal disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={deletingId === handover._id}
                              onClick={() => removeHandover(handover)}
                              title="Delete post"
                              type="button"
                            >
                              {deletingId === handover._id ? (
                                <LoaderCircle className="animate-spin" size={17} />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid min-h-40 place-items-center rounded-panel border border-dashed border-line bg-surface px-5 text-center">
                    <div>
                      <Images className="mx-auto text-muted" size={28} />
                      <p className="mt-3 text-sm font-bold text-muted">No uploaded sold car posts yet.</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
