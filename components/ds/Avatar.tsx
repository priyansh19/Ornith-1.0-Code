import * as React from "react";

export type AvatarRole = "user" | "research" | "critic" | "synth";
export type AvatarSize = "sm" | "md" | "lg";
export type AvatarStatus = "online" | "busy" | "off";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  label?: string;
  role?: AvatarRole;
  size?: AvatarSize;
  round?: boolean;
  status?: AvatarStatus;
}

const ROLE_GLYPH: Record<AvatarRole, string> = {
  user: "U",
  research: "R",
  critic: "C",
  synth: "S",
};

/** Square (or round) identity chip for users and agents. */
export function Avatar({
  src,
  alt = "",
  label,
  role,
  size = "md",
  round = false,
  status,
  className = "",
  ...rest
}: AvatarProps) {
  const cls = [
    "lm-avatar",
    size !== "md" ? `lm-avatar--${size}` : "",
    round ? "lm-avatar--round" : "",
    role ? `lm-avatar--${role}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const initials = label
    ? label.slice(0, 2).toUpperCase()
    : role
      ? ROLE_GLYPH[role]
      : "?";
  return (
    <span className={cls} {...rest}>
      {/* Plain <img>: a DS avatar takes arbitrary runtime src (data/blob/remote);
          next/image's fixed-dimension + domain config is the wrong fit here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={alt} /> : initials}
      {status && <span className={`lm-avatar__status lm-avatar__status--${status}`} />}
    </span>
  );
}
