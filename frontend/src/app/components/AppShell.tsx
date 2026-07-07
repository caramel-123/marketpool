import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useSession } from '../context/SessionContext';
import { NAV_BY_ROLE } from '../navConfig';
import { shortAddress } from '../lib/format';

export function AppShell({ children }: { children: ReactNode }) {
  const { walletConnected, walletAddress } = useWallet();
  const { activeRole, vendorProfile } = useSession();

  if (!walletConnected || !activeRole) {
    return <>{children}</>;
  }

  const navItems = NAV_BY_ROLE[activeRole];
  const initials = (vendorProfile?.display_name ?? walletAddress).slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FFF9F2] md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-orange-100 min-h-screen sticky top-0 h-screen shrink-0">
        <div className="p-5 border-b border-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                MP
              </span>
            </div>
            <div>
              <p className="font-bold text-[#2D2A26] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                Market Pool
              </p>
              <p className="text-xs text-[#7A6F65] mt-0.5">Paluwagan on Stellar</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all no-underline ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-[#7A6F65] hover:bg-orange-50 hover:text-[#2D2A26]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} className={isActive ? 'text-orange-500' : ''} />
                  <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-heading)' }}>
                    {item.label}
                  </span>
                  {isActive && <div className="ml-auto w-1.5 h-4 bg-orange-400 rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-300 flex items-center justify-center text-white font-bold text-xs flex-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2D2A26] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                {vendorProfile?.display_name ?? shortAddress(walletAddress)}
              </p>
              <p className="text-xs text-[#7A6F65] capitalize">{activeRole}</p>
            </div>
            <button className="relative flex-none" aria-label="Notifications">
              <Bell size={16} className="text-[#7A6F65]" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8 min-h-screen">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-orange-100 z-40 shadow-lg">
        <div className="flex items-end h-16 px-1">
          {navItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.end} className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative no-underline">
              {({ isActive }) =>
                item.primary ? (
                  <>
                    <div className="absolute -top-5" style={{ width: 52, height: 52 }}>
                      <div
                        className={`w-full h-full rounded-full flex items-center justify-center shadow-lg transition-transform ${
                          isActive ? 'bg-gradient-to-br from-orange-600 to-amber-500 scale-105' : 'bg-gradient-to-br from-orange-500 to-amber-400'
                        }`}
                      >
                        <item.icon size={22} className="text-white" />
                      </div>
                    </div>
                    <span className="text-xs mt-6 font-medium text-orange-500">{item.label}</span>
                  </>
                ) : (
                  <>
                    <item.icon size={21} className={isActive ? 'text-orange-500' : 'text-[#7A6F65]'} />
                    <span className={`text-xs ${isActive ? 'text-orange-500 font-semibold' : 'text-[#7A6F65]'}`}>{item.label}</span>
                    {isActive && <div className="absolute bottom-1 w-4 h-0.5 bg-orange-400 rounded-full" />}
                  </>
                )
              }
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
