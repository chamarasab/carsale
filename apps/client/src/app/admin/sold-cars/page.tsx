'use client';

import { ImagePlus, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Nav } from '@/components/nav';
import { createCustomerHandover, deleteCustomerHandover } from '@/lib/admin-api';
import { getCustomerHandovers } from '@/lib/api';
import type { CustomerHandover } from '@/lib/types';

const maximumFileSize = 10 * 1024 * 1024;

export default function AdminSoldCarsPage() {
  const { data: session, status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [handovers, setHandovers] = useState<CustomerHandover[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const isAdmin = session?.user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) return;
    getCustomerHandovers()
      .then(setHandovers)
      .catch(() => setMessage('Could not load sold car posts.'));
  }, [isAdmin]);

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
    setMessage('');
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('Select a valid image file.');
      return;
    }
    if (file.size > maximumFileSize) {
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('The selected image must be 10 MB or smaller.');
      return;
    }
    setSelectedFile(file);
  }

  async function uploadHandover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || !session?.accessToken || !isAdmin) return;

    setUploading(true);
    setMessage('');
    try {
      const handover = await createCustomerHandover(selectedFile, session.accessToken);
      setHandovers((current) => [handover, ...current]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('Sold car post published.');
    } catch {
      setMessage('Could not upload this image. Try a JPG, PNG, WebP, HEIF, or AVIF file.');
    } finally {
      setUploading(false);
    }
  }

  async function removeHandover(handover: CustomerHandover) {
    if (!session?.accessToken || !window.confirm('Delete this sold car post?')) return;

    setDeletingId(handover._id);
    setMessage('');
    try {
      await deleteCustomerHandover(handover._id, session.accessToken);
      setHandovers((current) => current.filter((item) => item._id !== handover._id));
      setMessage('Sold car post deleted.');
    } catch {
      setMessage('Could not delete this post.');
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
            <Link className="bg-brand-gradient mt-4 inline-flex rounded-panel px-4 py-3 text-sm font-black text-white" href="/login">
              Go to login
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
            <form className="rounded-panel border border-line bg-surface p-5 shadow-soft" onSubmit={uploadHandover}>
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
                    <Image alt="Selected sold car handover" className="object-contain" fill sizes="300px" src={previewUrl} unoptimized />
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
              {message ? <p className="mt-3 text-sm font-bold text-sub" role="status">{message}</p> : null}
            </form>

            <section aria-labelledby="sold-car-posts-title" className="min-w-0">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-signal">Latest first</p>
                  <h2 className="mt-2 text-2xl font-black text-foreground" id="sold-car-posts-title">Published images</h2>
                </div>
                <span className="text-sm font-black tabular-nums text-muted">{handovers.length}</span>
              </div>

              {handovers.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {handovers.map((handover) => (
                    <article className="overflow-hidden rounded-panel border border-line bg-surface shadow-soft" key={handover._id}>
                      <div className="relative aspect-[4/3] bg-field">
                        <Image
                          alt="Published customer handover"
                          className="object-cover"
                          fill
                          sizes="(max-width: 639px) 100vw, 360px"
                          src={handover.imageUrl}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3 p-3">
                        <time className="text-xs font-bold text-muted" dateTime={handover.createdAt}>
                          {formatDate(handover.createdAt)}
                        </time>
                        <button
                          aria-label="Delete sold car post"
                          className="grid size-10 shrink-0 place-items-center rounded-panel border border-line text-signal transition hover:border-signal disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={deletingId === handover._id}
                          onClick={() => removeHandover(handover)}
                          title="Delete post"
                          type="button"
                        >
                          {deletingId === handover._id ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-5 border-y border-line py-8 text-sm font-bold text-muted">No uploaded sold car posts yet.</div>
              )}
            </section>
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
