
'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DetailedStudent, alumni as initialAlumni } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function AlumniPage() {
  const [alumni] = useState<DetailedStudent[]>(initialAlumni);
  const [selectedYear, setSelectedYear] = useState('all');

  const availableYears = useMemo(() => {
    const years = new Set(alumni.map(a => a.tahunLulus).filter(Boolean));
    return Array.from(years).sort((a, b) => b! - a!);
  }, [alumni]);

  const filteredAlumni = useMemo(() => {
    let sortedAlumni = [...alumni].sort((a, b) => (b.tahunLulus || 0) - (a.tahunLulus || 0));
    if (selectedYear === 'all') {
      return sortedAlumni;
    }
    return sortedAlumni.filter(item => String(item.tahunLulus) === selectedYear);
  }, [alumni, selectedYear]);

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Alumni', 20, 10);
    doc.autoTable({
      head: [['Nama', 'NIS', 'Jenis Kelamin', 'TTL', 'Tahun Lulus', 'Alamat']],
      body: filteredAlumni.map((student) => [
        student.nama,
        student.nis,
        student.jenisKelamin,
        `${student.tempatLahir}, ${student.tanggalLahir}`,
        student.tahunLulus,
        student.alamat,
      ]),
    });
    doc.save('data-alumni.pdf');
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Data Alumni
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Jejak para lulusan IBNU AHMAD APP yang telah berkiprah.
            </p>
          </div>
           <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
        </div>

        <div className="mb-6 flex justify-end">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Tahun Lulus" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {availableYears.map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>


        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Nama</TableHead>
                <TableHead className="font-headline">NIS</TableHead>
                <TableHead className="font-headline">Jenis Kelamin</TableHead>
                <TableHead className="font-headline">TTL</TableHead>
                <TableHead className="font-headline">Tahun Lulus</TableHead>
                <TableHead className="font-headline">Alamat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlumni.map((student) => (
                <TableRow key={student.nis}>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>{`${student.tempatLahir}, ${student.tanggalLahir}`}</TableCell>
                  <TableCell>{student.tahunLulus}</TableCell>
                  <TableCell>{student.alamat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
