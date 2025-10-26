
'use client';

import Link from 'next/link';
import { Menu, School, UserCircle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Dasbor' },
  { href: '/guru', label: 'Data Guru' },
  { href: '/siswa', label: 'Data Siswa' },
  { href: '/kurikulum', label: 'Kurikulum' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden md:block">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <School className="h-6 w-6 text-primary" />
          <span className="font-headline text-xl font-bold text-primary">VibrantEdu</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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

        <div className="hidden md:block">
            <Button asChild size="sm" variant="outline">
              <Link href="/pendaftaran">
                <UserCircle className="mr-2 h-4 w-4" />
                Pendaftaran
              </Link>
            </Button>
        </div>

        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
               <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigasi utama situs. Pilih tautan untuk berpindah ke halaman lain.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col p-6">
                <Link href="/" className="mb-8 flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <School className="h-6 w-6 text-primary" />
                  <span className="font-headline text-xl font-bold text-primary">VibrantEdu</span>
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
                 <Button asChild size="lg" className="mt-8 bg-gradient-primary hover:brightness-110">
                    <Link href="/pendaftaran" onClick={() => setIsOpen(false)}>Daftar Sekarang</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
