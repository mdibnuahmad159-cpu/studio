
'use client';

import Link from 'next/link';
import { LogOut, Menu, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/context/AdminProvider';

const navLinks = [
  { href: '/', label: 'Dasbor' },
  { href: '/guru', label: 'Data Guru' },
  { href: '/siswa', label: 'Data Siswa' },
  { href: '/alumni', label: 'Data Alumni' },
  { href: '/kurikulum', label: 'Kurikulum' },
  { href: '/jadwal', label: 'Jadwal' },
  { href: '/kelas', label: 'Kelas' },
  { href: '/raport', label: 'Raport' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isAdmin, logout } = useAdmin();

  const renderAuthButton = () => {
    if (isAdmin) {
      return (
        <Button onClick={logout} size="sm" variant="ghost">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      );
    }
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/pendaftaran">
          <UserCircle className="mr-2 h-4 w-4" />
          Pendaftaran
        </Link>
      </Button>
    );
  };
  
  const renderMobileAuthButton = () => {
     if (isAdmin) {
      return (
        <Button onClick={() => { logout(); setIsOpen(false);}} size="lg" className="mt-8">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
        </Button>
      );
    }
    return (
       <Button asChild size="lg" className="mt-8 bg-gradient-primary hover:brightness-110">
          <Link href="/pendaftaran" onClick={() => setIsOpen(false)}>Daftar Sekarang</Link>
      </Button>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Desktop Header */}
      <div className="container hidden h-16 items-center justify-between md:flex">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-headline text-xl font-bold text-primary sr-only md:not-sr-only">IBNU AHMAD APP</span>
          </Link>
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="hidden md:block">
          {renderAuthButton()}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="container flex h-16 items-center justify-between md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
             <SheetHeader>
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Navigasi utama situs. Pilih tautan untuk berpindah ke halaman lain.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col p-6">
              <Link href="/" className="mb-8 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <span className="font-headline text-xl font-bold text-primary">IBNU AHMAD APP</span>
              </Link>
              <nav className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'text-lg font-medium transition-colors hover:text-primary',
                      pathname === link.href ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              {renderMobileAuthButton()}
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="font-headline text-xl font-bold text-primary">
          IBNU AHMAD APP
        </div>

        <Button asChild size="icon" variant="ghost">
          <Link href="/pendaftaran">
            <UserCircle className="h-6 w-6" />
            <span className="sr-only">Pendaftaran</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
