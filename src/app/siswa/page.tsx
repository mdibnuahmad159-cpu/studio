'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { detailedStudents } from '@/lib/data';
import { Download } from 'lucide-react';

export default function SiswaPage() {
  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
            Data Siswa
          </h1>
          <p className="mt-4 max-w-4xl mx-auto text-lg text-muted-foreground">
            Informasi detail mengenai siswa yang terdaftar di VibrantEdu.
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Nama</TableHead>
                <TableHead className="font-headline">NIS</TableHead>
                <TableHead className="font-headline">Jenis Kelamin</TableHead>
                <TableHead className="font-headline">TTL</TableHead>
                <TableHead className="font-headline">Nama Ayah</TableHead>
                <TableHead className="font-headline">Nama Ibu</TableHead>
                <TableHead className="font-headline">Alamat</TableHead>
                <TableHead className="font-headline text-right">Dokumen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailedStudents.map((student) => (
                <TableRow key={student.nis}>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>{`${student.tempatLahir}, ${student.tanggalLahir}`}</TableCell>
                  <TableCell>{student.namaAyah}</TableCell>
                  <TableCell>{student.namaIbu}</TableCell>
                  <TableCell>{student.alamat}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <a href={student.fileDokumen} download>
                        <Download className="mr-2 h-4 w-4" />
                        Unduh
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
