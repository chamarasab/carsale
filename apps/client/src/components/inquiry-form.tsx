'use client';

import { Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  buildVehicleInquiryMessage,
  openWhatsAppMessage,
  type VehicleInquiryDetails,
  vendorWhatsAppNumber,
} from '@/components/whatsapp-fab';
import { createInquiry } from '@/lib/api';

const vendorEmail = process.env.NEXT_PUBLIC_VENDOR_EMAIL ?? '';

export function InquiryForm({ carId, vehicle }: { carId: string; vehicle: VehicleInquiryDetails }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  function openWhatsApp() {
    openWhatsAppMessage(buildVehicleInquiryMessage(vehicle, window.location.href));
  }

  function openEmail() {
    const subject = `Vehicle inquiry: ${vehicle.title}`;
    const body = buildVehicleInquiryMessage(vehicle, window.location.href);

    window.location.href = `mailto:${vendorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

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
    <div className="space-y-4">
      {vendorWhatsAppNumber ? (
        <section className="rounded-panel border border-line bg-jdm-panel p-5 text-white shadow-soft">
          <p className="text-xs font-black uppercase tracking-wide text-white/60">Fastest response</p>
          <h2 className="mt-2 text-xl font-black">Talk to the vendor</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Ask about availability, ordering, payment stages, or the estimated handover cost.
          </p>
          <button
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-panel bg-[#25D366] px-4 text-sm font-black text-[#082f1b] hover:bg-[#20bd5a]"
            onClick={openWhatsApp}
            type="button"
          >
            <MessageCircle size={19} />
            Inquire on WhatsApp
          </button>
          {vendorEmail ? (
            <button
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel border border-white/20 px-4 text-sm font-black text-white hover:border-white/45 hover:bg-white/5"
              onClick={openEmail}
              type="button"
            >
              <Mail size={18} />
              Email inquiry
            </button>
          ) : null}
          <div className="mt-4 space-y-2 text-sm font-bold text-white/76">
            <a className="flex items-center gap-2 hover:text-white" href={`tel:+${vendorWhatsAppNumber}`}>
              <Phone size={16} />
              +94 76 197 0838
            </a>
            {vendorEmail ? (
              <a className="flex items-center gap-2 hover:text-white" href={`mailto:${vendorEmail}`}>
                <Mail size={16} />
                {vendorEmail}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <form className="space-y-3 rounded-panel border border-line bg-surface p-5 shadow-soft" onSubmit={onSubmit}>
      <h2 className="text-xl font-black text-foreground">Send a detailed inquiry</h2>
      <input className="h-11 w-full rounded-panel border border-line bg-field px-3 focus:border-signal focus:ring-signal/15" name="name" placeholder="Your name" required />
      <input className="h-11 w-full rounded-panel border border-line bg-field px-3 focus:border-signal focus:ring-signal/15" name="email" placeholder="Email" required type="email" />
      <input className="h-11 w-full rounded-panel border border-line bg-field px-3 focus:border-signal focus:ring-signal/15" name="phone" placeholder="Phone / WhatsApp" required />
      <textarea
        className="min-h-28 w-full rounded-panel border border-line bg-field px-3 py-3 focus:border-signal focus:ring-signal/15"
        name="message"
        placeholder="Preferred color, budget, registration needs, or timing"
      />
      <button
        className="bg-brand-gradient inline-flex h-11 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={state === 'submitting'}
        type="submit"
      >
        <Send size={16} />
        {state === 'submitting' ? 'Sending...' : 'Send inquiry'}
      </button>
      {state === 'sent' ? <p className="text-sm font-bold text-green-700 dark:text-green-400">Inquiry sent. We will contact you soon.</p> : null}
      {state === 'error' ? <p className="text-sm font-bold text-signal">Could not send inquiry. Check the API and try again.</p> : null}
      </form>
    </div>
  );
}
