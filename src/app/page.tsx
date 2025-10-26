
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpRight, BookOpen, Users, UserCircle, GraduationCap } from 'lucide-react';
import { teachers, detailedStudents, kitabPelajaran, alumni } from '@/lib/data';

export default function DashboardPage() {
  const totalStudents = detailedStudents.filter(s => s.status === 'Aktif').length;
  const totalTeachers = teachers.length;
  const totalSubjects = kitabPelajaran.length;
  const totalAlumni = alumni.length;

  const stats = [
    {
      title: 'Total Siswa Aktif',
      value: `${totalStudents} Siswa`,
      icon: UserCircle,
      href: '/siswa',
      description: 'Jumlah siswa aktif terdaftar',
    },
    {
      title: 'Total Guru',
      value: `${totalTeachers} Pendidik`,
      icon: Users,
      href: '/guru',
      description: 'Jumlah tenaga pendidik profesional',
    },
    {
      title: 'Total Mata Pelajaran',
      value: `${totalSubjects} Kitab`,
      icon: BookOpen,
      href: '/kurikulum',
      description: 'Jumlah kitab yang dipelajari',
    },
     {
      title: 'Total Alumni',
      value: `${totalAlumni} Lulusan`,
      icon: GraduationCap,
      href: '/alumni',
      description: 'Jumlah alumni yang telah lulus',
    },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 md:bg-background">
      <div className="container mx-auto max-w-5xl py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
             <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Statistik Sekolah</h1>
             <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                Ringkasan data terkini dari sistem informasi sekolah IBNU AHMAD APP.
             </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 md:px-0">
          {stats.map((stat, index) => (
            <Card key={index} className="bg-card shadow-lg hover:shadow-xl transition-shadow rounded-2xl md:rounded-lg flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col flex-grow justify-between">
                <div>
                    <div className="text-2xl font-bold bg-gradient-primary text-transparent bg-clip-text">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </div>
                <Link href={stat.href} className="flex items-center gap-1 text-xs text-primary hover:underline mt-4">
                    Lihat Detail <ArrowUpRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
