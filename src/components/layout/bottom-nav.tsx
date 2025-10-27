
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BookMarked, UserCircle, GraduationCap, CalendarDays, BookCopy, FileText, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/kurikulum', label: 'Kurikulum', icon: BookMarked },
  { href: '/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/nilai', label: 'Nilai', icon: ClipboardCheck },
  { href: '/kelas', label: 'Kelas', icon: BookCopy },
  { href: '/guru', label: 'Guru', icon: Users },
  { href: '/siswa', label: 'Siswa', icon: UserCircle },
  { href: '/alumni', label: 'Alumni', icon: GraduationCap },
  { href: '/raport', label: 'Raport', icon: FileText },
];

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);

  const topRowLinks = navLinks.slice(0, 5);
  const bottomRowLinks = navLinks.slice(5);

  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <AnimatePresence>
        {isVisible && (
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "calc(100% - 2rem)" }}
                transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            >
                <div className="relative flex justify-center">
                    <Button
                        onClick={toggleVisibility}
                        variant="secondary"
                        className="absolute -top-7 h-8 w-12 rounded-t-lg rounded-b-none px-2 shadow-lg"
                        aria-label="Sembunyikan Menu"
                    >
                        <ChevronDown className="h-5 w-5" />
                    </Button>
                </div>
                <div
                    className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                >
                    <nav className="grid grid-cols-5 items-center h-16">
                        {topRowLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'flex flex-col items-center justify-center text-muted-foreground transition-colors w-full h-full pt-2 pb-1',
                                isActive ? 'text-primary' : 'hover:text-primary'
                            )}
                            >
                            <link.icon className="h-5 w-5 mb-1" />
                            <span className="text-[10px] text-center">{link.label}</span>
                            </Link>
                        );
                        })}
                    </nav>
                    <nav className="grid grid-cols-4 items-center h-16 border-t">
                        {bottomRowLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                'flex flex-col items-center justify-center text-muted-foreground transition-colors w-full h-full pt-2 pb-1',
                                isActive ? 'text-primary' : 'hover:text-primary'
                                )}
                            >
                                <link.icon className="h-5 w-5 mb-1" />
                                <span className="text-[10px] text-center">{link.label}</span>
                            </Link>
                            );
                        })}
                    </nav>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {!isVisible && (
           <motion.div
                initial={{ y: "calc(100% - 2rem)"}}
                animate={{ y: 0 }}
                exit={{ y: "calc(100% - 2rem)"}}
                transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
                className="relative"
            >
             <Button
                onClick={toggleVisibility}
                variant="secondary"
                className="absolute -top-7 left-1/2 -translate-x-1/2 h-8 w-12 rounded-t-lg rounded-b-none px-2 shadow-lg"
                aria-label="Tampilkan Menu"
            >
                <ChevronUp className="h-5 w-5" />
            </Button>
           </motion.div>
      )}
    </div>
  );
}
