
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
import { Siswa as DetailedStudent } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { FileDown, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
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
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Input } from '@/components/ui/input';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function AlumniPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const alumniQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Lulus'));
  }, [firestore, user]);
  const { data: alumni, isLoading } = useCollection<DetailedStudent>(alumniQuery);
  const { isAdmin } = useAdmin();
  
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [alumnusToDelete, setAlumnusToDelete] = useState<DetailedStudent | null>(null);

  const availableYears = useMemo(() => {
    if (!alumni) return [];
    const years = new Set(alumni.map(a => a.tahunLulus).filter(Boolean));
    return Array.from(years).sort((a, b) => b! - a!);
  }, [alumni]);

  const filteredAlumni = useMemo(() => {
    if (!alumni) return [];
    let filtered = [...alumni];

    if (selectedYear !== 'all') {
      filtered = filtered.filter(item => String(item.tahunLulus) === selectedYear);
    }

    if (searchQuery) {
        filtered = filtered.filter(item => 
            item.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.nis.includes(searchQuery)
        );
    }
    
    return filtered.sort((a, b) => (b.tahunLulus || 0) - (a.tahunLulus || 0));
  }, [alumni, selectedYear, searchQuery]);

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
    if (!isAdmin) return;
    setAlumnusToDelete(alumnus);
  };

  const confirmDelete = () => {
    if (alumnusToDelete && firestore) {
      const studentDocRef = doc(firestore, 'siswa', alumnusToDelete.id);
      updateDocumentNonBlocking(studentDocRef, { status: 'Aktif', tahunLulus: null });
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
           <Button onClick={handleExportPdf} variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari Nama atau NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                {isAdmin && <TableHead className="font-headline text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={isAdmin ? 7 : 6}>Loading...</TableCell></TableRow>}
              {filteredAlumni.map((student) => (
                <TableRow key={student.nis}>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>{`${student.tempatLahir}, ${student.tanggalLahir}`}</TableCell>
                  <TableCell>{student.tahunLulus}</TableCell>
                  <TableCell>{student.alamat}</TableCell>
                  {isAdmin && (
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
                            <span>Batalkan Kelulusan</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {isAdmin && (
        <AlertDialog open={!!alumnusToDelete} onOpenChange={() => setAlumnusToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan mengembalikan status "{alumnusToDelete?.nama}" menjadi siswa aktif.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Konfirmasi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
