import type { ComponentType, SVGProps } from 'react';
import {
  Accessibility, Archive, ArrowLeft, ArrowRight, Bell, BookOpen, Bot, Brain, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck,
  CircleUserRound, ClipboardCheck, Eye, EyeOff, FileText, GraduationCap, Hourglass, House, KeyRound,
  Lightbulb, LockKeyhole, LogOut, Mail, Menu, Mic, Pencil, Play, Plus, Puzzle, Rabbit,
  RefreshCcw, Rocket, RotateCcw, Settings, ShieldCheck, Sparkles, Square, Star,
  Target, Trash2, Turtle, Users, Volume2, WandSparkles, X, ZoomIn,
} from 'lucide-react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<string, IconComponent> = {
  '📚': BookOpen, '▶': Play, '▶️': Play, '⏳': Hourglass,
  '⏹️': Square, '⏹': Square, '🔈': Volume2, '🐢': Turtle, '🐇': Rabbit,
  '⚠️': CircleAlert, '⚠': CircleAlert, '✅': CheckCircle2, '❌': X, '⬜': Square,
  '🙈': EyeOff, '👁️': Eye, '👁': Eye, '🚶': ArrowRight, '✕': X, '×': X,
  '➕': Plus, '🚪': LogOut, '🎯': Target, '🧩': Puzzle, '🎤': Mic, '🎙️': Mic, '🎙': Mic,
  '🔊': Volume2, '🧠': Brain, '💡': Lightbulb, '🏠': House, '🎧': Volume2,
  '👧': Users, '✏️': Pencil, '✏': Pencil, '📧': Mail, '✉️': Mail, '✉': Mail,
  '🔒': LockKeyhole, '🗑️': Trash2, '🗑': Trash2, '↔️': ArrowLeft, '👀': Eye,
  '🔔': Bell, '↩️': RotateCcw, '↩': RotateCcw, '🛡️': ShieldCheck, '🛡': ShieldCheck,
  '🔑': KeyRound, '🔁': RefreshCcw, '📖': BookOpen, '📝': ClipboardCheck,
  '📄': FileText, '➡️': ArrowRight, '✨': Sparkles, '🔠': ZoomIn, '🔤': Pencil,
  '🌓': CircleUserRound, '📏': ArrowRight, '♿': Accessibility, '♻️': RefreshCcw,
  '♻': RefreshCcw, '⚙': Settings, '☰': Menu, '🎓': GraduationCap, '👪': Users,
  '🧒': CircleUserRound, '⛔': CircleAlert, '●': CircleCheck, '★': Star, '✓': Check,
  '↻': RefreshCcw, '◔': CircleCheck, '🔒 ': LockKeyhole, '🚀': Rocket, '🛠️': Settings,
  '✍️': Pencil, '⚡': WandSparkles, '☺': CircleUserRound, '＋': Plus, '▥': FileText,
  '♟': Users, '⌂': House, '⌃': ChevronDown, '›': ChevronRight, '‹': ChevronLeft,
  // Historic text encoding variants retained while old layout strings are migrated.
  'âŒ‚': House, 'â–¥': FileText, 'â–¦': CalendarDays, 'â™Ÿ': Users, 'âœ‰': Mail,
  'âš™': Settings, 'â†ª': LogOut, 'â˜°': Menu, 'ðŸ‘¥': Users, 'ðŸŽ“': GraduationCap,
  'ðŸ””': Bell, 'â–£': Archive, 'â€º': ChevronRight, 'â€¹': ChevronLeft, 'Ã—': X,
};

export function AppIcon({ name, className = 'h-5 w-5', strokeWidth = 2 }: { name?: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name || ''] || Bot;
  return <Icon aria-hidden="true" focusable="false" className={className} strokeWidth={strokeWidth} />;
}
