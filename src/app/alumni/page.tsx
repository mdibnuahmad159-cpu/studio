
'use client';

import { useState, useMemo, useRef } from 'react';
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
import { Siswa as DetailedStudent, Raport } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { FileDown, MoreHorizontal, Pencil, Search, Trash2, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
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
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const { toast } = useToast();
  
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [alumnusToDelete, setAlumnusToDelete] = useState<DetailedStudent | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  const downloadTemplate = () => {
    const headers = ["nis","nama","jenisKelamin","tempatLahir","tanggalLahir","namaAyah","namaIbu","alamat","status","kelas","tahunLulus"];
    const ws = XLSX.utils.json_to_sheet([], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_alumni.xlsx");
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImportFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!importFile || !firestore) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const newAlumni = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (newAlumni.length === 0) {
              toast({ variant: 'destructive', title: 'Gagal', description: 'File Excel kosong atau format tidak sesuai.' });
              return;
            }

            const batch = writeBatch(firestore);

            newAlumni.forEach(alumnus => {
              if (alumnus.nis && alumnus.nama) {
                const studentDocRef = doc(firestore, 'siswa', String(alumnus.nis));
                const raportDocRef = doc(firestore, 'raports', String(alumnus.nis));

                const studentData: Omit<DetailedStudent, 'id'> = {
                  nis: String(alumnus.nis),
                  nama: alumnus.nama,
                  jenisKelamin: alumnus.jenisKelamin || 'Laki-laki',
                  tempatLahir: alumnus.tempatLahir || '',
                  tanggalLahir: alumnus.tanggalLahir || '',
                  namaAyah: alumnus.namaAyah || '',
                  namaIbu: alumnus.namaIbu || '',
                  alamat: alumnus.alamat || '',
                  fileDokumen: '', // default placeholder
                  kelas: alumnus.kelas ? Number(alumnus.kelas) : 6,
                  status: 'Lulus',
                  tahunLulus: alumnus.tahunLulus ? Number(alumnus.tahunLulus) : new Date().getFullYear(),
                };
                batch.set(studentDocRef, studentData, { merge: true });

                const newRaport: Omit<Raport, 'id'> = {
                  nis: String(alumnus.nis),
                  raports: {
                    kelas_0_ganjil: null, kelas_0_genap: null,
                    kelas_1_ganjil: null, kelas_1_genap: null,
                    kelas_2_ganjil: null, kelas_2_genap: null,
                    kelas_3_ganjil: null, kelas_3_genap: null,
                    kelas_4_ganjil: null, kelas_4_genap: null,
                    kelas_5_ganjil: null, kelas_5_genap: null,
                    kelas_6_ganjil: null, kelas_6_genap: null,
                  }
                };
                batch.set(raportDocRef, newRaport, { merge: true });
              }
            });
            
            await batch.commit();
            toast({ title: 'Import Berhasil!', description: `${newAlumni.length} data alumni berhasil ditambahkan/diperbarui.` });
            setIsImportDialogOpen(false);
            setImportFile(null);
        } catch (error) {
            console.error("Error importing alumni: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Terjadi kesalahan saat mengimpor data.' });
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file: ", error);
        toast({ variant: 'destructive', title: 'Error Reading File', description: 'Gagal memproses file Excel.' });
    };
    reader.readAsBinaryString(importFile);
  };

  return (
    <div className="bg-background pb-32 md:pb-0">
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
           <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" /> Import Data
                </Button>
              )}
               <Button onClick={handleExportPdf} variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Ekspor PDF
              </Button>
           </div>
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
        <>
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
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Data Alumni dari Excel</DialogTitle>
                <DialogDescription>
                  Pilih file Excel untuk import data alumni. Pastikan NIS unik. Data yang sudah ada akan diperbarui.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Input 
                    id="import-file" 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleImportFileChange}
                    ref={importInputRef} 
                  />
                </div>
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Unduh Template Excel
                  </Button>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsImportDialogOpen(false)}>Batal</Button>
                <Button onClick={handleImport} disabled={!importFile}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
