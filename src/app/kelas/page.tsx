
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
import { detailedStudents as initialStudents, DetailedStudent } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronsUp, ChevronsDown, GraduationCap, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function KelasPage() {
  const [students, setStudents] = useState<DetailedStudent[]>(initialStudents);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('all');
  const { toast } = useToast();

  const handleSelectStudent = (nis: string) => {
    setSelectedStudents(prev =>
      prev.includes(nis) ? prev.filter(s => s !== nis) : [...prev, nis]
    );
  };
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
        setSelectedStudents(filteredStudents.map(s => s.nis));
    } else {
        setSelectedStudents([]);
    }
  };

  const filteredStudents = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Aktif');
    if (selectedKelas === 'all') {
      return activeStudents;
    }
    return activeStudents.filter(item => String(item.kelas) === selectedKelas);
  }, [students, selectedKelas]);

  const handleAction = (action: 'promote' | 'demote' | 'graduate') => {
    if (selectedStudents.length === 0) {
        toast({ title: "Peringatan", description: "Tidak ada siswa yang dipilih.", variant: "destructive" });
        return;
    }
    
    setStudents(prevStudents => {
      const newStudents = prevStudents.map(student => {
        if (selectedStudents.includes(student.nis)) {
          if (action === 'promote' && student.kelas < 6) {
            return { ...student, kelas: student.kelas + 1 };
          }
          if (action === 'demote' && student.kelas > 0) {
            return { ...student, kelas: student.kelas - 1 };
          }
          if (action === 'graduate' && student.kelas === 6) {
            return { ...student, status: 'Lulus', tahunLulus: new Date().getFullYear() };
          }
        }
        return student;
      });
      return newStudents;
    });

    toast({ title: "Sukses", description: `Aksi berhasil diterapkan pada ${selectedStudents.length} siswa.` });
    setSelectedStudents([]);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Siswa per Kelas', 20, 10);
    doc.autoTable({
      head: [['Kelas', 'Nama', 'NIS', 'Jenis Kelamin', 'Keterangan']],
      body: filteredStudents.map((student) => [
        `Kelas ${student.kelas}`,
        student.nama,
        student.nis,
        student.jenisKelamin,
        student.status,
      ]),
    });
    doc.save('data-kelas.pdf');
  };
  
  const currentKelasForSelection = selectedStudents.length > 0
    ? students.find(s => s.nis === selectedStudents[0])?.kelas
    : undefined;

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Pengelolaan Kelas
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola data siswa berdasarkan kelas, naikkan, turunkan, atau luluskan siswa.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Aksi untuk {selectedStudents.length} siswa
                  <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAction('promote')} disabled={currentKelasForSelection === 6}>
                  <ChevronsUp className="mr-2 h-4 w-4" />
                  Naik Kelas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('demote')} disabled={currentKelasForSelection === 0}>
                  <ChevronsDown className="mr-2 h-4 w-4" />
                  Turun Kelas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('graduate')} disabled={currentKelasForSelection !== 6}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Luluskan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {[...Array(7)].map((_, i) => (
                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                   <Checkbox 
                        checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Pilih semua"
                    />
                </TableHead>
                <TableHead className="font-headline w-[100px]">Kelas</TableHead>
                <TableHead className="font-headline">Nama</TableHead>
                <TableHead className="font-headline">NIS</TableHead>
                <TableHead className="font-headline">Jenis Kelamin</TableHead>
                <TableHead className="font-headline">Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.nis} data-state={selectedStudents.includes(student.nis) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(student.nis)}
                      onCheckedChange={() => handleSelectStudent(student.nis)}
                      aria-label={`Pilih ${student.nama}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">Kelas {student.kelas}</TableCell>
                  <TableCell>{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${student.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {student.status}
                    </span>
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
