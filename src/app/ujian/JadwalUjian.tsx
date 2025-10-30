
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { JadwalUjian, Guru, Kurikulum } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyJadwal: Omit<JadwalUjian, 'id'> = {
  hari: 'Sabtu',
  kelas: '0',
  mataPelajaran: '',
  guruId: '',
  guruName: '',
  jam: '08:00 - 10:00',
};

const HARI_OPERASIONAL = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
const JAM_PELAJARAN = ['08:00 - 10:00', '10:30 - 12:30', '14:00 - 16:00'];
const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function JadwalUjianComponent() {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { user } = useUser();
  
  const [selectedKelas, setSelectedKelas] = useState('');
  
  const jadwalUjianRef = useMemoFirebase(() => {
    if (!user || !selectedKelas) return null;
    return query(collection(firestore, 'jadwalUjian'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: jadwalUjian, isLoading: jadwalLoading } = useCollection<JadwalUjian>(jadwalUjianRef);

  const [allTeachers, setAllTeachers] = useState<Guru[]>([]);
  const [allKitabPelajaran, setAllKitabPelajaran] = useState<Kurikulum[]>([]);
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jadwalToEdit, setJadwalToEdit] = useState<JadwalUjian | null>(null);
  const [jadwalToDelete, setJadwalToDelete] = useState<JadwalUjian | null>(null);
  const [formData, setFormData] = useState<Omit<JadwalUjian, 'id'>>(emptyJadwal);
  const [selectedHari, setSelectedHari] = useState('all');

  const filteredJadwal = useMemo(() => {
    if (!jadwalUjian) return [];
    let filtered = jadwalUjian;
    if (selectedHari !== 'all') {
      filtered = filtered.filter(item => item.hari === selectedHari);
    }
    return filtered.sort((a,b) => HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari) || a.jam.localeCompare(b.jam));
  }, [jadwalUjian, selectedHari]);

  const kitabPelajaranForForm = useMemo(() => {
      if (!allKitabPelajaran) return [];
      return allKitabPelajaran.filter(k => k.kelas === formData.kelas);
  }, [allKitabPelajaran, formData.kelas]);

  const loadDropdownData = async () => {
    if (!firestore || !user || isDataLoaded) return;
    try {
      const teachersQuery = query(collection(firestore, 'gurus'));
      const kurikulumQuery = query(collection(firestore, 'kurikulum'));

      const [teachersSnapshot, kurikulumSnapshot] = await Promise.all([
        getDocs(teachersQuery),
        getDocs(kurikulumQuery),
      ]);

      const teachersData = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guru));
      const kurikulumData = kurikulumSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kurikulum));

      setAllTeachers(teachersData);
      setAllKitabPelajaran(kurikulumData);
      setIsDataLoaded(true);
    } catch (error) {
      console.error("Failed to load dropdown data:", error);
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
     if (name === 'guruId') {
      const selectedTeacher = allTeachers?.find(t => t.id === value);
      setFormData(prev => ({ 
        ...prev, 
        guruId: value, 
        guruName: selectedTeacher?.name || '' 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenDialog = async (item: JadwalUjian | null = null) => {
    if (!isAdmin) return;
    
    if (!isDataLoaded) {
      await loadDropdownData();
    }

    setJadwalToEdit(item);
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({ ...emptyJadwal, kelas: selectedKelas });
    }
    setIsDialogOpen(true);
  };

  const handleSaveJadwal = () => {
    const jadwalCollectionRef = collection(firestore, 'jadwalUjian');
    if (formData.kelas && formData.mataPelajaran && formData.guruId && formData.jam && formData.hari && jadwalCollectionRef && firestore) {
      const dataToSave = { ...formData };
      if (jadwalToEdit) {
        const jadwalDocRef = doc(firestore, 'jadwalUjian', jadwalToEdit.id);
        updateDocumentNonBlocking(jadwalDocRef, dataToSave);
      } else {
        addDocumentNonBlocking(jadwalCollectionRef, dataToSave);
      }
      setIsDialogOpen(false);
      setJadwalToEdit(null);
    }
  };

  const handleDeleteJadwal = (item: JadwalUjian) => {
    if (!isAdmin) return;
    setJadwalToDelete(item);
  };
  
  const confirmDelete = () => {
    if (jadwalToDelete && firestore) {
        const jadwalDocRef = doc(firestore, 'jadwalUjian', jadwalToDelete.id);
        deleteDocumentNonBlocking(jadwalDocRef);
        setJadwalToDelete(null);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text(`Jadwal Ujian - Kelas ${selectedKelas}`, 20, 10);
    
    const head: any[] = [['Hari', 'Jam', 'Pelajaran', 'Pengawas']];
    const body: any[] = [];
    
    filteredJadwal.forEach(item => {
        body.push([
          item.hari,
          item.jam,
          item.mataPelajaran,
          item.guruName
        ]);
    });

    doc.autoTable({ head, body });
    doc.save(`jadwal-ujian-kelas-${selectedKelas}.pdf`);
  };

  const isLoading = jadwalLoading && !!selectedKelas;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isAdmin && (
              <Button onClick={() => handleOpenDialog()} size="sm" disabled={!selectedKelas}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal Ujian
              </Button>
          )}
          <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={!jadwalUjian || jadwalUjian.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
          </Button>
        </div>
        <div className="flex gap-4">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                    {KELAS_OPTIONS.map(kelas => (
                        <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedHari} onValueChange={setSelectedHari} disabled={!selectedKelas}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Hari" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Hari</SelectItem>
                    {HARI_OPERASIONAL.map(hari => (
                        <SelectItem key={hari} value={hari}>{hari}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline">Hari</TableHead>
              <TableHead className="font-headline">Jam</TableHead>
              <TableHead className="font-headline">Mata Pelajaran</TableHead>
              <TableHead className="font-headline">Pengawas</TableHead>
              {isAdmin && <TableHead className="font-headline text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-24">Loading...</TableCell>
              </TableRow>
            )}
            {!isLoading && filteredJadwal.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-24 text-muted-foreground">
                       {selectedKelas ? "Tidak ada jadwal ujian untuk kelas ini." : "Silakan pilih kelas terlebih dahulu."}
                    </TableCell>
                </TableRow>
            )}
            {!isLoading && filteredJadwal.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.hari}</TableCell>
                <TableCell>{item.jam}</TableCell>
                <TableCell>{item.mataPelajaran}</TableCell>
                <TableCell>{item.guruName}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteJadwal(item)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Hapus</span>
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

      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{jadwalToEdit ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian'}</DialogTitle>
                <DialogDescription>
                  {jadwalToEdit ? 'Perbarui informasi jadwal ujian.' : `Isi formulir untuk menambahkan jadwal ujian baru untuk kelas ${formData.kelas}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas</Label>
                  <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={formData.kelas}>
                    <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                    <SelectContent>
                      {KELAS_OPTIONS.map(kelas => <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="hari">Hari</Label>
                  <Select name="hari" onValueChange={(value) => handleSelectChange('hari', value)} value={formData.hari}>
                    <SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                    <SelectContent>
                      {HARI_OPERASIONAL.map(hari => <SelectItem key={hari} value={hari}>{hari}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jam">Jam</Label>
                  <Select name="jam" onValueChange={(value) => handleSelectChange('jam', value)} value={formData.jam}>
                    <SelectTrigger><SelectValue placeholder="Pilih Jam" /></SelectTrigger>
                    <SelectContent>
                      {JAM_PELAJARAN.map(jam => <SelectItem key={jam} value={jam}>{jam}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mataPelajaran">Mata Pelajaran</Label>
                  <Select name="mataPelajaran" onValueChange={(value) => handleSelectChange('mataPelajaran', value)} value={formData.mataPelajaran} disabled={!isDataLoaded}>
                    <SelectTrigger><SelectValue placeholder={isDataLoaded ? "Pilih Mata Pelajaran" : "Memuat..."} /></SelectTrigger>
                    <SelectContent>
                      {kitabPelajaranForForm.map((mapel) => (
                        <SelectItem key={mapel.id} value={mapel.mataPelajaran}>[{mapel.kode}] {mapel.mataPelajaran}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guruId">Pengawas</Label>
                  <Select name="guruId" onValueChange={(value) => handleSelectChange('guruId', String(value))} value={String(formData.guruId)} disabled={!isDataLoaded}>
                    <SelectTrigger><SelectValue placeholder={isDataLoaded ? "Pilih Pengawas" : "Memuat..."} /></SelectTrigger>
                    <SelectContent>
                      {allTeachers?.map(teacher => (
                        <SelectItem key={teacher.id} value={String(teacher.id)}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" onClick={handleSaveJadwal}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog open={!!jadwalToDelete} onOpenChange={() => setJadwalToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                <AlertDialogDescription>
                  Jadwal ujian untuk kelas {jadwalToDelete?.kelas} pada hari {jadwalToDelete?.hari} akan dihapus.
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
        </>
      )}
    </>
  );
}
