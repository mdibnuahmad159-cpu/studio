
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { kitabPelajaran } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type Kitab = {
  kelas: string;
  mataPelajaran: string;
  kitab: string;
};

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function KurikulumPage() {
  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Kurikulum', 20, 10);
    doc.autoTable({
      head: [['Kelas', 'Mata Pelajaran', 'Kitab']],
      body: kitabPelajaran.map((item: Kitab) => [item.kelas, item.mataPelajaran, item.kitab]),
    });
    doc.save('data-kurikulum.pdf');
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Mata Pelajaran & Kitab
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Daftar kitab yang dipelajari dalam kurikulum kami untuk setiap
              jenjang kelas.
            </p>
          </div>
          <Button onClick={handleExportPdf} className="w-full sm:w-auto">
            <FileDown className="mr-2 h-4 w-4" />
            Ekspor PDF
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] font-headline">Kelas</TableHead>
                <TableHead className="font-headline">Mata Pelajaran</TableHead>
                <TableHead className="font-headline">Kitab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kitabPelajaran.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.kelas}</TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>{item.kitab}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
