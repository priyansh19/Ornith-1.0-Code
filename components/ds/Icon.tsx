import * as React from "react";
import {
  ArrowUp,
  Bell,
  Brain,
  Check,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  Menu,
  Cpu,
  Download,
  Eraser,
  FilePen,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  GitBranch,
  History,
  Layers,
  Link,
  Lock,
  LockOpen,
  Mic,
  MoreHorizontal,
  PanelRight,
  PanelRightClose,
  Paperclip,
  Pencil,
  Pin,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Settings,
  Sparkles,
  Square,
  Terminal,
  Trash2,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

/* Maps the kebab-case icon names used across the kit (mirroring the
   prototype's lucide CDN usage) to lucide-react components. */
const REGISTRY: Record<string, LucideIcon> = {
  "arrow-up": ArrowUp,
  bell: Bell,
  brain: Brain,
  check: Check,
  "chevron-right": ChevronRight,
  "circle-alert": CircleAlert,
  "circle-help": CircleHelp,
  menu: Menu,
  cpu: Cpu,
  download: Download,
  eraser: Eraser,
  "file-pen": FilePen,
  "file-text": FileText,
  folder: Folder,
  "folder-input": FolderInput,
  "folder-open": FolderOpen,
  "folder-plus": FolderPlus,
  "folder-search": FolderSearch,
  "git-branch": GitBranch,
  history: History,
  layers: Layers,
  link: Link,
  lock: Lock,
  "lock-open": LockOpen,
  mic: Mic,
  "more-horizontal": MoreHorizontal,
  "panel-right": PanelRight,
  "panel-right-close": PanelRightClose,
  paperclip: Paperclip,
  pencil: Pencil,
  pin: Pin,
  play: Play,
  plus: Plus,
  "refresh-cw": RefreshCw,
  "rotate-ccw": RotateCcw,
  search: Search,
  server: Server,
  settings: Settings,
  sparkles: Sparkles,
  square: Square,
  terminal: Terminal,
  trash: Trash2,
  users: Users,
  wrench: Wrench,
  x: X,
};

export type IconName = keyof typeof REGISTRY;

export interface IconProps {
  name: IconName | string;
  size?: number;
}

/** Inline icon. `<Icon name="git-branch" size={13} />` */
export function Icon({ name, size = 16 }: IconProps) {
  const Cmp = REGISTRY[name];
  if (!Cmp) return null;
  return <Cmp size={size} aria-hidden />;
}
