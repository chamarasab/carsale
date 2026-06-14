'use client';

import { Send } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { createInquiry } from '@/lib/api';

export function InquiryForm({ carId }: { carId: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('submitting');

    const formData = new FormData(event.currentTarget);
    try {
      await createInquiry({
        carId,
        name: String(formData.get('name')),
        email: String(formData.get('email')),
        phone: String(formData.get('phone')),
        message: String(formData.get('message') ?? ''),
      });
      event.currentTarget.reset();
      setState('sent');
    } catch {
      setState('error');
    }
  }

  return (
    <form className="space-y-3 bg-white p-5 shadow-soft" onSubmit={onSubmit}>
      <h2 className="text-xl font-black text-ink">Inquire about this car</h2>
      <input className="h-11 w-full border border-black/15 px-3" name="name" placeholder="Your name" required />
      <input className="h-11 w-full border border-black/15 px-3" name="email" placeholder="Email" required type="email" />
      <input className="h-11 w-full border border-black/15 px-3" name="phone" placeholder="Phone / WhatsApp" required />
      <textarea
        className="min-h-28 w-full border border-black/15 px-3 py-3"
        name="message"
        placeholder="Preferred color, budget, registration needs, or timing"
      />
      <button
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-signal px-4 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-graphite"
        disabled={state === 'submitting'}
        type="submit"
      >
        <Send size={16} />
        {state === 'submitting' ? 'Sending...' : 'Send inquiry'}
      </button>
      {state === 'sent' ? <p className="text-sm font-bold text-green-700">Inquiry sent. We will contact you soon.</p> : null}
      {state === 'error' ? <p className="text-sm font-bold text-signal">Could not send inquiry. Check the API and try again.</p> : null}
    </form>
  );
}
