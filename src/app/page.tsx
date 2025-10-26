
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, ArrowUpRight, DollarSign, BookOpen, CalendarDays, BarChart2, UserCheck } from 'lucide-react';
import { teachers, students } from '@/lib/data';

const quickActions = [
  { label: 'Bayar SPP', icon: DollarSign, href: '#' },
  { label: 'Lihat Nilai', icon: BarChart2, href: '#' },
  { label: 'Jadwal', icon: CalendarDays, href: '#' },
  { label: 'Absensi', icon: UserCheck, href: '#' },
];

const announcements = [
  { title: 'Ujian Akhir Semester', date: '15 Des 2023', description: 'Jadwal UAS telah terbit. Lihat di portal siswa.' },
  { title: 'Kegiatan Class Meeting', date: '18 Des 2023', description: 'Lomba antar kelas akan diadakan setelah UAS.' },
  { title: 'Libur Semester Ganjil', date: '22 Des 2023', description: 'Libur semester dimulai dari 22 Desember hingga 5 Januari.' },
]

export default function DashboardPage() {
  const activeStudents = students.length;
  const totalTeachers = teachers.length;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 md:bg-background">
      <div className="container mx-auto max-w-lg md:max-w-4xl py-4 md:py-8 px-0 md:px-4">
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:hidden">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Selamat Datang,</p>
              <p className="font-semibold text-foreground">Pengguna</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Bell className="h-6 w-6" />
          </Button>
        </header>

        {/* Main Card for Desktop */}
        <div className="hidden md:block mb-8 text-center">
             <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Dasbor Utama</h1>
             <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Selamat datang di dasbor sekolah VibrantEdu.
             </p>
        </div>


        {/* Summary Card */}
        <div className="px-4 md:p-0">
          <Card className="bg-primary text-primary-foreground shadow-lg md:shadow-xl rounded-2xl md:rounded-lg">
            <CardHeader>
              <CardDescription className="text-primary-foreground/80">Total Siswa Aktif</CardDescription>
              <CardTitle className="text-4xl font-bold">{activeStudents} Siswa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                  <span><span className="font-semibold">{totalTeachers}</span> Tenaga Pendidik</span>
                  <Link href="/siswa" className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white font-semibold py-1 px-2 rounded-full">
                    Lihat Detail <ArrowUpRight className="h-3 w-3" />
                  </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="p-4 md:p-0">
            <h2 className="text-lg font-semibold my-4 md:mt-8 md:mb-4 md:text-xl">Aksi Cepat</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
                {quickActions.map((action) => (
                <Link href={action.href} key={action.label}>
                    <div className="bg-card p-4 rounded-lg shadow-sm hover:bg-secondary transition-colors">
                        <action.icon className="h-7 w-7 mx-auto text-primary" />
                        <span className="mt-2 text-xs font-medium text-muted-foreground block">{action.label}</span>
                    </div>
                </Link>
                ))}
            </div>
        </div>

        {/* Announcements / Recent Activity */}
        <div className="p-4 md:p-0">
            <h2 className="text-lg font-semibold my-4 md:mt-8 md:mb-4 md:text-xl">Pengumuman Terbaru</h2>
            <div className="space-y-3">
                {announcements.map((item, index) => (
                    <Card key={index} className="bg-card shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-secondary p-3 rounded-lg">
                                <BookOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                            <span className="text-xs text-muted-foreground self-start">{item.date}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
