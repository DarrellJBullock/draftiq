import {
  LayoutDashboard,
  Users,
  Sparkles,
  ListOrdered,
  Layers,
  Compass,
  Swords,
  Radio,
  LineChart,
  Moon,
  ShieldAlert,
  UserCog,
  ArrowLeftRight,
  Bot,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, description: "Your draft command center" },
  { href: "/players", label: "Players", icon: Users, description: "Searchable player database" },
  { href: "/rookies", label: "Rookies", icon: Sparkles, description: "Rookie Watch dashboard" },
  { href: "/rankings", label: "Rankings", icon: ListOrdered, description: "Consensus & expert rankings" },
  { href: "/tiers", label: "Tiers", icon: Layers, description: "Position-based tiers" },
  { href: "/draft-strategy", label: "Draft Strategy", icon: Compass, description: "Recommended strategy for your league" },
  { href: "/mock-draft", label: "Mock Draft", icon: Swords, description: "Simulate a full draft" },
  { href: "/draft-day", label: "Draft Day", icon: Radio, description: "Live draft assistant" },
  { href: "/adp", label: "ADP", icon: LineChart, description: "Average draft position analysis" },
  { href: "/sleepers", label: "Sleepers", icon: Moon, description: "Undervalued targets" },
  { href: "/busts", label: "Busts", icon: ShieldAlert, description: "Overvalued risks" },
  { href: "/team-builder", label: "Team Builder", icon: UserCog, description: "Build and grade a roster" },
  { href: "/trade-analyzer", label: "Trade Analyzer", icon: ArrowLeftRight, description: "Evaluate a trade" },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot, description: "Ask the draft assistant" },
  { href: "/settings", label: "Settings", icon: Settings, description: "League & scoring settings" },
];
