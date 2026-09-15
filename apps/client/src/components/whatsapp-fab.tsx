'use client';

import { MessageCircle, PhoneCall } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { jpy } from '@/lib/format';
import { vendorContact } from '@/lib/vendor-contact';

export type VehicleInquiryDetails = {
  title: string;
  maker: string;
  model: string;
  vehicleGrade?: string;
  modelCode?: string;
  year: number;
  auctionGrade: string;
  mileageKm: number;
  auctionDate?: string;
  location: string;
  auctionPriceJpy: number;
};

export const vendorWhatsAppNumber = vendorContact.whatsappNumber;

export function buildVehicleInquiryMessage(vehicle: VehicleInquiryDetails, listingUrl: string) {
  return [
    'Hello, I am interested in this vehicle listed on Genuine Automobiles.',
    [
      `Vehicle: ${vehicle.year} ${vehicle.maker} ${vehicle.model}${vehicle.vehicleGrade ? ` ${vehicle.vehicleGrade}` : ''}`,
      `Auction grade: Grade ${vehicle.auctionGrade}`,
      `Mileage: ${vehicle.mileageKm.toLocaleString('en-US')} km`,
      vehicle.modelCode ? `Model code: ${vehicle.modelCode}` : '',
      vehicle.auctionDate ? `Auction date: ${vehicle.auctionDate}` : '',
      `Auction location: ${vehicle.location}`,
      `Japan auction price: ${jpy(vehicle.auctionPriceJpy)}`,
    ]
      .filter(Boolean)
      .join('\n'),
    listingUrl ? `Listing: ${listingUrl}` : '',
    'Please confirm availability and share the next steps.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${vendorWhatsAppNumber}?text=${encodeURIComponent(message)}`;
}

function useCurrentPageUrl() {
  const [pageUrl, setPageUrl] = useState('');

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  return pageUrl;
}

export function WhatsAppFab() {
  const pathname = usePathname();
  const pageUrl = useCurrentPageUrl();
  const hiddenRoute =
    pathname.startsWith('/cars/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/users') ||
    pathname === '/login' ||
    pathname === '/signup';

  if (!vendorWhatsAppNumber || hiddenRoute) return null;

  const message = [
    'Hello, I would like help finding a vehicle through Genuine Automobiles.',
    pageUrl ? `Page: ${pageUrl}` : '',
    'Please share the available Japan auction and local stock options.',
  ]
    .filter(Boolean)
    .join('\n\n');

  return (
    <FloatingWhatsAppButton
      href={buildWhatsAppUrl(message)}
      label="Ask about a vehicle on WhatsApp"
    />
  );
}

export function PhoneFab() {
  const pathname = usePathname();
  const hiddenRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/users') ||
    pathname === '/login' ||
    pathname === '/signup';

  if (!vendorContact.callLabel || hiddenRoute) return null;

  const label = `Call Genuine Automobiles on ${vendorContact.callLabel}`;

  return (
    <a
      aria-label={label}
      className="fixed bottom-[148px] right-6 z-50 hidden h-[52px] w-[52px] place-items-center rounded-full border border-white/35 bg-brand-gradient text-white shadow-theme transition duration-200 hover:-translate-y-1 hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-signal/25 sm:grid"
      href={`tel:${vendorContact.callLabel}`}
      title={`${label} (${vendorContact.displayPhone})`}
    >
      <PhoneCall aria-hidden size={22} strokeWidth={2.4} />
    </a>
  );
}

export function VehicleWhatsAppFab({ vehicle }: { vehicle: VehicleInquiryDetails }) {
  const pageUrl = useCurrentPageUrl();

  if (!vendorWhatsAppNumber) return null;

  return (
    <FloatingWhatsAppButton
      href={buildWhatsAppUrl(buildVehicleInquiryMessage(vehicle, pageUrl))}
      label={`Ask about ${vehicle.title} on WhatsApp`}
    />
  );
}

function FloatingWhatsAppButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      aria-label={label}
      className="fixed bottom-[84px] right-5 z-50 grid h-[52px] w-[52px] place-items-center rounded-full border border-white/35 bg-[#25D366] text-[#082f1b] shadow-theme transition duration-200 hover:-translate-y-1 hover:bg-[#20bd5a] focus:outline-none focus:ring-4 focus:ring-[#25D366]/25 sm:bottom-[88px] sm:right-6"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={label}
    >
      <MessageCircle size={23} strokeWidth={2.4} />
    </a>
  );
}
