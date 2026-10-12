import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 3.5v9l7-4.5-7-4.5z" fill="currentColor" stroke="none" />
  </Icon>
);

export const PauseIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="3.5" width="2.6" height="9" rx="0.8" fill="currentColor" stroke="none" />
    <rect x="9.4" y="3.5" width="2.6" height="9" rx="0.8" fill="currentColor" stroke="none" />
  </Icon>
);

export const StepBackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 3.5v9M12 3.8 6.5 8l5.5 4.2V3.8z" />
  </Icon>
);

export const StepForwardIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.5v9M4 3.8 9.5 8 4 12.2V3.8z" />
  </Icon>
);

export const RestartIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 8a5 5 0 1 0 1.6-3.7M3 3v3h3" />
  </Icon>
);

export const ShuffleIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 4.5h2.2c1.4 0 2.2.7 3 2l1.4 2.6c.7 1.3 1.6 2.4 3 2.4h1.4M2.5 11.5h2.2c1 0 1.7-.4 2.3-1.1M9.6 5.6c.6-.7 1.3-1.1 2.3-1.1h1.6M12 2.5l2 2-2 2M12 9.5l2 2-2 2" />
  </Icon>
);

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m3.5 8.4 2.9 2.9 6-6.6" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 5.5v3.2M8 11h.01" />
    <circle cx="8" cy="8" r="6" />
  </Icon>
);

export const DashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.5 8h7" />
  </Icon>
);

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" />
    <path d="M10.5 3.5v-.2A1.3 1.3 0 0 0 9.2 2H3.3A1.3 1.3 0 0 0 2 3.3v5.9a1.3 1.3 0 0 0 1.3 1.3h.2" />
  </Icon>
);

export const ArrowIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 8h9M9 4.5 12.5 8 9 11.5" />
  </Icon>
);

export const LinkIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.6.6M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.6-.6" />
  </Icon>
);
