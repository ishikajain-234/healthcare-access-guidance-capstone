import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  ClipboardList,
  Package,
  BarChart3,
  Building2,
  HelpCircle,
  Activity,
  Menu,
  X,
  Shield,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function AppShell({
  currentView,
  onNavigate,
  hospitals = [],
  selectedHospitalId,
  onSelectHospital,
  systemStatus = 'HEALTHY',
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'OPD_QUEUE', label: 'OPD Queue', icon: Users },
    { id: 'BEDS', label: 'Beds', icon: BedDouble },
    { id: 'ADMISSIONS', label: 'Admissions', icon: ClipboardList },
    { id: 'INVENTORY', label: 'Inventory', icon: Package },
    { id: 'ANALYTICS', label: 'Analytics', icon: BarChart3 },
    { id: 'CITY_OVERVIEW', label: 'City Overview', icon: Building2 },
  ];

  const citizenNavItems = [
    { id: 'CITIZEN_GUIDANCE', label: 'Citizen Guidance Flow', icon: HelpCircle },
    { id: 'GUIDANCE_ADMIN', label: 'Guidance Audit Ledger', icon: Shield },
  ];

  const handleNavClick = (viewId) => {
    onNavigate(viewId);
    setMobileMenuOpen(false);
  };

  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('DASHBOARD')}>
              <div className="w-7 h-7 rounded bg-terracotta-600 text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-none">
                PS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                    Hospital Operations Coordination
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 rounded">
                    PS-75
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                  Academic Capstone Prototype &bull; Delhi Health Services
                </p>
              </div>
            </div>
          </div>

          {/* Right: Hospital Selector, Role & System Status */}
          <div className="flex items-center gap-3">
            {/* Hospital Selector */}
            {hospitals.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-slate-500 text-[11px] font-medium">Facility:</span>
                <select
                  value={selectedHospitalId || ''}
                  onChange={(e) => onSelectHospital(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  {hospitals.map((h) => (
                    <option key={h.hospital_id} value={h.hospital_id}>
                      {h.hospital_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Role indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Operations Desk (Demo)</span>
            </div>

            {/* System Status indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline text-[11px] font-medium font-mono">
                {systemStatus === 'HEALTHY' ? 'API Online (v2.1)' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Facility Selector */}
        {hospitals.length > 0 && (
          <div className="sm:hidden px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Facility:</span>
            <select
              value={selectedHospitalId || ''}
              onChange={(e) => onSelectHospital(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 text-xs"
            >
              {hospitals.map((h) => (
                <option key={h.hospital_id} value={h.hospital_id}>
                  {h.hospital_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Desktop Persistent Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
          <div className="p-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 px-4 pt-4">
            Operations Modules
          </div>
          <nav className="flex-1 px-2 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                    isActive
                      ? 'bg-terracotta-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-5 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Public Portal & Audit
            </div>
            {citizenNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                currentView === item.id ||
                (item.id === 'CITIZEN_GUIDANCE' && currentView.startsWith('GUIDANCE_'));
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-amber-300 font-semibold border-l-2 border-amber-400'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer info */}
          <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500">
            <p className="font-semibold text-slate-400">17-Table Schema Freeze</p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-500">Zero-PII &bull; Synthetic Demo</p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-900/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-slate-900 text-slate-300 p-4 flex flex-col z-10">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Operations Navigation
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Operations Modules
              </div>
              <nav className="flex-1 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                        isActive
                          ? 'bg-terracotta-600 text-white font-semibold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                <div className="pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Public Portal & Audit
                </div>
                {citizenNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentView === item.id ||
                    (item.id === 'CITIZEN_GUIDANCE' && currentView.startsWith('GUIDANCE_'));
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                        isActive
                          ? 'bg-slate-800 text-amber-300 font-semibold'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Notice Bar */}
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-1.5 text-center text-[11px] text-amber-900">
            <span className="font-semibold">Simulated Demonstration Environment:</span> Operational coordination platform with strictly synthetic data. Zero real patient PII, zero clinical triage.
          </div>

          <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </div>

          {/* Academic Footer */}
          <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center text-[11px] text-slate-500">
            <p>
              Healthcare Access Guidance & Operations Coordination &bull; Delhi Health Services MedTech PS-75 Capstone Demonstration
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Strictly synthetic data &bull; M/M/c Erlang-C Queue Benchmarking &bull; Non-clinical operational orchestration
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
