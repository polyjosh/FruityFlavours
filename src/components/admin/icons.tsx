import type { SVGProps } from "react";

// Admin icons from the design boards (24×24, stroke = currentColor).
type P = SVGProps<SVGSVGElement> & { size?: number };

const Svg = ({ size = 20, strokeWidth = 2, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...p} />
);

export const OrdersIcon = (p: P) => (
  <Svg {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </Svg>
);
export const CatalogIcon = (p: P) => (
  <Svg {...p}>
    <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" />
    <path d="M3 7.5l9 4.5 9-4.5M12 12v9" />
  </Svg>
);
export const ReportsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
);
export const MessageIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Svg>
);
export const SettingsIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Svg>
);
export const ExternalIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const BellIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
  </Svg>
);
export const CloseIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const SearchIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Svg>
);
export const UploadIcon = (p: P) => (
  <Svg {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
  </Svg>
);
export const DownloadIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
);
export const FilterIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 5h16l-6 8v6l-4-2v-4z" />
  </Svg>
);
export const PencilIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Svg>
);
export const StarIcon = ({ size = 12, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
);
