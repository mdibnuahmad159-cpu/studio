
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { DetailedStudent, alumni as initialAlumni, detailedStudents as initialStudents } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { FileDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// This is a mock in-memory store to sync data across pages.
// In a real app, you would use a proper database or state management solution.
let dataStore = {
    students: initialStudents,
    alumni: initialAlumni,
};

export default function AlumniPage() {
  const [alumni, setAlumni] = useState<DetailedStudent[]>(dataStore.alumni);
  const [selectedYear, setSelectedYear] = useState('all');
  const [alumnusToDelete, setAlumnusToDelete] = useState<DetailedStudent | null>(null);

  // Effect to sync state with the mock data store on component mount and updates
  useEffect(() => {
    setAlumni(dataStore.alumni);
  }, []); 

  useEffect(() => {
    // This effect listens for external changes to the data store
    // and updates the component's state if necessary.
    const interval = setInterval(() => {
      if (dataStore.alumni !== alumni) {
        setAlumni(dataStore.alumni);
      }
    }, 1000); // Check every second for simplicity.
    return () => clearInterval(interval);
  }, [alumni]);

  const updateAlumni = (newAlumni: DetailedStudent[]) => {
      dataStore.alumni = newAlumni;
      setAlumni(newAlumni);
  };

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

  const handleDeleteAlumnus = (alumnus: DetailedStudent) => {
    setAlumnusToDelete(alumnus);
  };

  const confirmDelete = () => {
    if (alumnusToDelete) {
      const newAlumni = alumni.filter(s => s.nis !== alumnusToDelete.nis);
      updateAlumni(newAlumni);
      setAlumnusToDelete(null);
    }
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
                <TableHead className="font-headline text-right">Aksi</TableHead>
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
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteAlumnus(student)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Hapus</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <AlertDialog open={!!alumnusToDelete} onOpenChange={() => setAlumnusToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
            <AlertDialogDescription>
              Data alumni "{alumnusToDelete?.nama}" akan dihapus secara permanen. Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    

    