
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground hidden md:block">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-headline text-2xl font-bold text-primary">IBNU AHMAD APP</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">Membentuk masa depan cerah melalui pendidikan berkualitas.</p>
          </div>
          <div>
            <h3 className="font-headline font-semibold">Tautan Cepat</h3>
            <ul className="mt-4 space-y-2">
              <li><Link href="/guru" className="text-sm text-muted-foreground hover:text-primary">Data Guru</Link></li>
              <li><Link href="/siswa" className="text-sm text-muted-foreground hover:text-primary">Data Siswa</Link></li>
              <li><Link href="/alumni" className="text-sm text-muted-foreground hover:text-primary">Data Alumni</Link></li>
              <li><Link href="/kurikulum" className="text-sm text-muted-foreground hover:text-primary">Kurikulum</Link></li>
            </ul>
          </div>
           <div>
            <h3 className="font-headline font-semibold">Akses</h3>
            <ul className="mt-4 space-y-2">
               <li><Link href="/pendaftaran" className="text-sm text-muted-foreground hover:text-primary">Pendaftaran</Link></li>
               <li><Link href="/kelas" className="text-sm text-muted-foreground hover:text-primary">Kelas</Link></li>
               <li><Link href="/raport" className="text-sm text-muted-foreground hover:text-primary">Raport</Link></li>
               <li><Link href="/login" className="text-sm text-muted-foreground hover:text-primary">Login Admin</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} IBNU AHMAD APP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
