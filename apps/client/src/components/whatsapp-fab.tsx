'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { jpy } from '@/lib/format';

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

export const vendorWhatsAppNumber = (process.env.NEXT_PUBLIC_VENDOR_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

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
    `Listing: ${listingUrl}`,
    'Please confirm availability and share the next steps.',
  ].join('\n\n');
}

export function openWhatsAppMessage(message: string) {
  if (!vendorWhatsAppNumber) return;
  window.open(
    `https://wa.me/${vendorWhatsAppNumber}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export function WhatsAppFab() {
  const pathname = usePathname();
  const hiddenRoute =
    pathname.startsWith('/cars/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/users') ||
    pathname === '/login' ||
    pathname === '/signup';

  if (!vendorWhatsAppNumber || hiddenRoute) return null;

  return (
    <FloatingWhatsAppButton
      label="Ask about a vehicle on WhatsApp"
      onClick={() => {
        const message = [
          'Hello, I would like help finding a vehicle through Genuine Automobiles.',
          `Page: ${window.location.href}`,
          'Please share the available Japan auction and local stock options.',
        ].join('\n\n');
        openWhatsAppMessage(message);
      }}
    />
  );
}

export function VehicleWhatsAppFab({ vehicle }: { vehicle: VehicleInquiryDetails }) {
  if (!vendorWhatsAppNumber) return null;

  return (
    <FloatingWhatsAppButton
      label={`Ask about ${vehicle.title} on WhatsApp`}
      onClick={() => openWhatsAppMessage(buildVehicleInquiryMessage(vehicle, window.location.href))}
    />
  );
}

function FloatingWhatsAppButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="fixed bottom-[84px] right-5 z-50 grid h-[52px] w-[52px] place-items-center rounded-full border border-white/35 bg-[#25D366] text-[#082f1b] shadow-theme focus:outline-none focus:ring-4 focus:ring-[#25D366]/25 sm:hidden"
      onClick={onClick}
      title={label}
      type="button"
    >
      <MessageCircle size={23} strokeWidth={2.4} />
    </button>
  );
}
