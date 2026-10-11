/** Stroke icons drawn for Exifo (24 × 24 grid, currentColor). */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };
export type IconComponent = (props: IconProps) => React.ReactElement;

function make(children: React.ReactNode, defaultStroke = 1.8) {
  return function Icon({ size = 18, strokeWidth = defaultStroke, ...rest }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const CleanIcon = make(
  <>
    <path d="M4 8h7v5h5v7H4z" />
    <rect x="14.5" y="3.5" width="6" height="6" rx="1" />
  </>,
);
export const InspectIcon = make(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const CheckCircleIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </>,
);
export const EditIcon = make(<path d="M4 20h4L19 9l-4-4L4 16v4z" />);
export const CompareIcon = make(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M12 4v16" />
  </>,
);
export const CompressIcon = make(<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />);
export const ConvertIcon = make(<path d="M4 9h13l-3-3M20 15H7l3 3" />);
export const ResizeIcon = make(<path d="M7 3v14h14M3 7h14v14" />);
export const WatermarkIcon = make(<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />);
export const RenameIcon = make(<path d="M5 6h14M12 6v12M9 18h6" />);
export const PdfIcon = make(
  <>
    <path d="M7 3h7l5 5v13H7V3z" />
    <path d="M14 3v5h5" />
  </>,
);
export const LockIcon = make(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
);
export const MoonIcon = make(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />);
export const SunIcon = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);
export const UploadIcon = make(<path d="M12 15V3m0 0L8 7m4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />);
export const DownloadIcon = make(<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />, 2);
export const CloseIcon = make(<path d="M18 6 6 18M6 6l12 12" />, 2);
export const ImageIcon = make(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M21 16l-5-5L5 20" />
  </>,
  1.6,
);
export const InfoIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
  2,
);
export const PinIcon = make(
  <>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
  2,
);
export const TickIcon = make(<path d="M20 6 9 17l-5-5" />, 2.4);
export const WarningIcon = make(
  <>
    <path d="M12 4 2.5 20h19L12 4z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
  2,
);
export const ErrorIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </>,
  2,
);
export const ChevronDownIcon = make(<path d="M6 9l6 6 6-6" />, 2);
export const ChevronUpIcon = make(<path d="M6 15l6-6 6 6" />, 2);
export const MenuIcon = make(<path d="M4 7h16M4 12h16M4 17h16" />, 2);
export const CopyIcon = make(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </>,
);
export const ShareIcon = make(
  <>
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="m8.4 13.3 7.2 4.4M15.6 6.3l-7.2 4.4" />
  </>,
);
export const FolderIcon = make(<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />);
export const SearchIcon = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </>,
);
export const ExternalIcon = make(<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />);
export const MapIcon = make(<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />);
export const RotateCwIcon = make(<path d="M20 4v6h-6M20 10a8 8 0 1 0-2.3 5.7" />);
export const RotateCcwIcon = make(<path d="M4 4v6h6M4 10a8 8 0 1 1 2.3 5.7" />);
export const FlipHIcon = make(<path d="M12 3v18M8 7l-4 5 4 5V7zM16 7l4 5-4 5V7z" />);
export const FlipVIcon = make(<path d="M3 12h18M7 8l5-4 5 4H7zM7 16l5 4 5-4H7z" />);
export const GripIcon = make(
  <>
    <circle cx="9" cy="6" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </>,
  2,
);
export const ClockIcon = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />, 2);
export const ArrowRightIcon = make(<path d="M5 12h14m-5-5 5 5-5 5" />, 2);
export const SparkIcon = make(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />);
export const LayersIcon = make(<path d="m12 3 9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />);
export const ShieldIcon = make(<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3z" />);
export const TrashIcon = make(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
