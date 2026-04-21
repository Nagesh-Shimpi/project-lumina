import { ReactNode } from "react";

interface PhoneFrameProps {
  label: string;
  index: number;
  children: ReactNode;
}

export const PhoneFrame = ({ label, index, children }: PhoneFrameProps) => {
  return (
    <div className="flex flex-col items-center gap-4 animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="phone-frame">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-24 h-6 bg-black rounded-full" />
        <div className="phone-screen">{children}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">0{index + 1}</span>
        <span className="text-sm font-display font-semibold text-foreground">{label}</span>
      </div>
    </div>
  );
};
