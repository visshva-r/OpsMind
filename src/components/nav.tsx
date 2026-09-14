"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  Brain,
  GitBranch,
  FileSearch,
  Network,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/copilot", label: "Expert Copilot", icon: Bot },
  { href: "/agents/rca", label: "Maintenance RCA", icon: Brain },
  { href: "/agents/compliance", label: "Compliance Agent", icon: ShieldCheck },
  { href: "/documents", label: "Documents", icon: BookOpen },
  { href: "/graph", label: "Knowledge Graph", icon: Network },
  { href: "/architecture", label: "Architecture", icon: GitBranch },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-6 lg:block">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-cyan-400">
          <FileSearch className="h-6 w-6" />
          <span className="text-lg font-semibold tracking-wide">OpsMind</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Unified asset and operations knowledge layer
        </p>
      </div>
      <nav className="space-y-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "border border-cyan-500/30 bg-cyan-500/10 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${active ? "text-cyan-300" : "text-cyan-400"}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950 px-4 py-3 lg:hidden">
      {navItems.map(({ href, label }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
              active
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                : "border-slate-700 text-slate-300"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
