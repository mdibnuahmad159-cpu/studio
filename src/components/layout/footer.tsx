
import { School, Facebook, Twitter, Instagram } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground hidden md:block">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <School className="h-8 w-8 text-primary" />
              <span className="font-headline text-2xl font-bold text-primary">IBNU AHMAD APP</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">Membentuk masa depan cerah melalui pendidikan berkualitas.</p>
          </div>
          <div>
            <h3 className="font-headline font-semibold">Tautan Cepat</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/guru" className="text-sm text-muted-foreground hover:text-primary">Data Guru</Link></li>
              <li><Link href="/siswa" className="text-sm text-muted-foreground hover:text-primary">Data Siswa</Link></li>
              <li><Link href="/kelas" className="text-sm text-muted-foreground hover:text-primary">Data Kelas</Link></li>
              <li><Link href="/alumni" className="text-sm text-muted-foreground hover:text-primary">Data Alumni</Link></li>
              <li><Link href="/kurikulum" className="text-sm text-muted-foreground hover:text-primary">Kurikulum</Link></li>
              <li><Link href="/pendaftaran" className="text-sm text-muted-foreground hover:text-primary">Pendaftaran</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-headline font-semibold">Hubungi Kami</h3>
            <address className="mt-4 not-italic text-sm space-y-2 text-muted-foreground">
              <p>Jl. Pendidikan No. 123, Jakarta</p>
              <p>Email: <a href="mailto:info@ibnuahmadapp.sch.id" className="hover:text-primary">info@ibnuahmadapp.sch.id</a></p>
              <p>Telp: (021) 123-4567</p>
            </address>
          </div>
          <div>
            <h3 className="font-headline font-semibold">Ikuti Kami</h3>
            <div className="mt-4 flex space-x-4">
              <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook /></a>
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary"><Twitter /></a>
              <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary"><Instagram /></a>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} IBNU AHMAD APP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
