import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  BrainCircuit,
  ShieldAlert,
  AlertOctagon,
  CheckSquare,
  Activity,
  Bot,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  onToggle,
}) => {
  const navSections = [
    {
      heading: 'MAIN',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'documents', label: 'Documents', icon: FolderGit2 },
        { id: 'intelligence', label: 'Project Intelligence', icon: BrainCircuit },
      ],
    },
    {
      heading: 'ANALYSIS',
      items: [
        { id: 'risks', label: 'Risks', icon: ShieldAlert },
        { id: 'blockers-actions', label: 'Blockers & Action Items', icon: AlertOctagon },
        { id: 'health', label: 'Project Health', icon: Activity },
      ],
    },
    {
      heading: 'AI & OUTPUTS',
      items: [
        { id: 'assistant', label: 'AI Assistant', icon: Bot },
        { id: 'reports', label: 'Reports & Doc Gen', icon: FileSpreadsheet },
      ],
    },
    {
      heading: 'SYSTEM & SPEC',
      items: [
        { id: 'roadmap', label: 'Architecture & Milestones', icon: Layers },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Area */}
        <div>
          <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs tracking-tight text-white block leading-snug">
                  AI Project Intelligence
                </span>
                <span className="text-[10px] text-teal-400 font-mono tracking-wider uppercase block">
                  & Risk Advisor
                </span>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navSections.map((section) => (
              <div key={section.heading}>
                <span className="px-3 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold block mb-1">
                  {section.heading}
                </span>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activePage === item.id ||
                      (item.id === 'blockers-actions' && (activePage === 'blockers' || activePage === 'actions'));
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActivePage(item.id);
                          if (window.innerWidth < 1024) onToggle();
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                          isActive
                            ? 'bg-teal-500/10 border border-teal-500/25 text-teal-300 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Profile Card */}
        
      </aside>
    </>
  );
};
