import type { SVGProps } from 'react';

/** Small stroke icon set (24px grid, currentColor). */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconCamera = (p: P) => (
  <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></Svg>
);
export const IconBarcode = (p: P) => (
  <Svg {...p}><path d="M4 6v12M7 6v12M11 6v12M14 6v12M18 6v12M20 6v12" /></Svg>
);
export const IconImage = (p: P) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></Svg>
);
export const IconEdit = (p: P) => (
  <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13 7 4 4" /></Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const IconUser = (p: P) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Svg>
);
export const IconScan = (p: P) => (
  <Svg {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><path d="M8 12h8" /></Svg>
);
export const IconBack = (p: P) => (
  <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IconExternal = (p: P) => (
  <Svg {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Svg>
);
export const IconRefresh = (p: P) => (
  <Svg {...p}><path d="M20 11a8 8 0 0 0-14-5l-2 2M4 13a8 8 0 0 0 14 5l2-2" /><path d="M4 4v4h4M20 20v-4h-4" /></Svg>
);
export const IconChevron = (p: P) => (
  <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>
);
export const IconHome = (p: P) => (
  <Svg {...p}><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" /></Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const IconAlert = (p: P) => (
  <Svg {...p}><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9" /></Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></Svg>
);
export const IconSpark = (p: P) => (
  <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16Z" /></Svg>
);
export const IconBox = (p: P) => (
  <Svg {...p}><path d="M4 8 12 4l8 4v8l-8 4-8-4V8Z" /><path d="M4 8l8 4 8-4M12 12v8" /></Svg>
);
export const IconBag = (p: P) => (
  <Svg {...p}><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>
);
