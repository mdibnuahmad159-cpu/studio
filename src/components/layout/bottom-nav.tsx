
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BookMarked, UserCircle, GraduationCap, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/kurikulum', label: 'Kurikulum', icon: BookMarked },
  { href: '/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/guru', label: 'Guru', icon: Users },
  { href: '/siswa', label: 'Siswa', icon: UserCircle },
  { href: '/alumni', label: 'Alumni', icon: GraduationCap },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <nav className="flex justify-around items-center h-16">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center text-muted-foreground transition-colors w-full h-full',
                isActive ? 'text-primary' : 'hover:text-primary'
              )}
            >
              <link.icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
