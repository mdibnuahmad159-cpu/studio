
'use client';

import React, { useState, useMemo } from 'react';
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
import { CalendarIcon, FileDown, PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { JadwalUjian, Guru, Kurikulum } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const JAM_PELAJARAN = ['08:00 - 09:30', '10:00 - 11:30', '13:00 - 14:30'];
const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

const emptyJadwalUjian: Omit<JadwalUjian, 'id'> = {
  tanggal: new Date().toISOString(),
  kelas: '0',
  mataPelajaran: '',
  guruId: '',
  jam: '08:00 - 09:30',
};

export default function JadwalUjianComponent() {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { user } = useUser();
  const [selectedKelas, setSelectedKelas] = useState('all');

  const jadwalUjianRef = useMemoFirebase(() => {
    if (!user || selectedKelas === 'all') return null;
    return query(collection(firestore, 'jadwalUjian'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: jadwalUjian, isLoading: jadwalUjianLoading } = useCollection<JadwalUjian>(jadwalUjianRef);

  const teachersRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'gurus');
  }, [firestore, user]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Guru>(teachersRef);
  
  const kurikulumRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'kurikulum');
  }, [firestore, user]);
  const { data: kitabPelajaran, isLoading: kurikulumLoading } = useCollection<Kurikulum>(kurikulumRef);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jadwalToEdit, setJadwalToEdit] = useState<JadwalUjian | null>(null);
  const [jadwalToDelete, setJadwalToDelete] = useState<JadwalUjian | null>(null);
  const [formData, setFormData] = useState<Omit<JadwalUjian, 'id'>>(emptyJadwalUjian);

  const groupedJadwal = useMemo(() => {
    if (!jadwalUjian) return {};
    const grouped: { [tanggal: string]: JadwalUjian[] } = {};
    jadwalUjian.forEach(item => {
      const date = format(parseISO(item.tanggal), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    for (const date in grouped) {
        grouped[date].sort((a,b) => JAM_PELAJARAN.indexOf(a.jam) - JAM_PELAJARAN.indexOf(b.jam));
    }
    
    return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
  }, [jadwalUjian]);

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, tanggal: date.toISOString() }));
    }
  };

  const handleOpenDialog = (item: JadwalUjian | null = null) => {
    if (!isAdmin) return;
    setJadwalToEdit(item);
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({ ...emptyJadwalUjian, kelas: selectedKelas === 'all' ? '0' : selectedKelas });
    }
    setIsDialogOpen(true);
  };

  const handleSaveJadwal = () => {
    if (firestore && formData.kelas && formData.mataPelajaran && formData.guruId && formData.jam && formData.tanggal) {
      const jadwalUjianCollection = collection(firestore, 'jadwalUjian');
      const dataToSave = { ...formData };
      if (jadwalToEdit) {
        const jadwalDocRef = doc(firestore, 'jadwalUjian', jadwalToEdit.id);
        updateDocumentNonBlocking(jadwalDocRef, dataToSave);
      } else {
        addDocumentNonBlocking(jadwalUjianCollection, dataToSave);
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

  const getTeacherName = (guruId: string) => {
    const teacher = teachers?.find(t => t.id === guruId);
    return teacher ? teacher.name.split(',')[0] : 'N/A';
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text(`Jadwal Ujian - ${selectedKelas === 'all' ? 'Semua Kelas' : `Kelas ${selectedKelas}`}`, 14, 15);
    
    doc.autoTable({
        head: [['Tanggal', 'Jam', 'Kelas', 'Mata Pelajaran', 'Pengawas']],
        body: Object.entries(groupedJadwal).flatMap(([_, jadwalItems]) => 
            jadwalItems.map(item => [
                format(parseISO(item.tanggal), "eeee, dd MMMM yyyy", { locale: localeID }),
                item.jam,
                `Kelas ${item.kelas}`,
                item.mataPelajaran,
                getTeacherName(item.guruId)
            ])
        ),
        startY: 25,
    });
    
    doc.save(`jadwal-ujian.pdf`);
  };

  const isLoading = jadwalUjianLoading || teachersLoading || kurikulumLoading;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isAdmin && (
              <Button onClick={() => handleOpenDialog()} size="sm" disabled={selectedKelas === 'all'}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal Ujian
              </Button>
          )}
          <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={Object.keys(groupedJadwal).length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
          </Button>
        </div>
        <div className="flex gap-4">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Pilih Kelas</SelectItem>
                    {KELAS_OPTIONS.map(kelas => (
                        <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {selectedKelas === 'all' ? (
        <p className="text-center text-muted-foreground mt-8">Silakan pilih kelas terlebih dahulu untuk melihat atau menambah jadwal ujian.</p>
      ) : isLoading ? (
         <p className="text-center">Memuat jadwal ujian...</p>
      ) : Object.keys(groupedJadwal).length === 0 ? (
         <p className="text-center text-muted-foreground mt-8">Tidak ada jadwal ujian untuk ditampilkan.</p>
      ) : (
         <div className="space-y-8">
            {Object.entries(groupedJadwal).map(([tanggal, jadwalItems]) => (
                <div key={tanggal}>
                    <h2 className="font-headline text-xl font-bold mb-4 border-b pb-2">
                        {format(parseISO(tanggal), "eeee, dd MMMM yyyy", { locale: localeID })}
                    </h2>
                    <div className="border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-1/4">Jam</TableHead>
                                    <TableHead className="w-1/4">Kelas</TableHead>
                                    <TableHead className="w-1/4">Mata Pelajaran</TableHead>
                                    <TableHead className="w-1/4">Pengawas</TableHead>
                                    {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jadwalItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.jam}</TableCell>
                                        <TableCell>Kelas {item.kelas}</TableCell>
                                        <TableCell>{item.mataPelajaran}</TableCell>
                                        <TableCell>{getTeacherName(item.guruId)}</TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteJadwal(item)} className="text-red-500">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
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
            ))}
         </div>
      )}

      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{jadwalToEdit ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian Baru'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.tanggal && "text-muted-foreground"
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.tanggal ? format(parseISO(formData.tanggal), "PPP", { locale: localeID }) : <span>Pilih tanggal</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={parseISO(formData.tanggal)}
                        onSelect={handleDateChange}
                        initialFocus
                        />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas</Label>
                  <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={formData.kelas}>
                    <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                    <SelectContent>
                      {KELAS_OPTIONS.map(kelas => (
                            <SelectItem key={kelas} value={kelas} disabled>{`Kelas ${kelas}`}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jam">Jam</Label>
                  <Select name="jam" onValueChange={(value) => handleSelectChange('jam', value)} value={formData.jam}>
                    <SelectTrigger><SelectValue placeholder="Pilih Jam" /></SelectTrigger>
                    <SelectContent>
                      {JAM_PELAJARAN.map(jam => (
                            <SelectItem key={jam} value={jam}>{jam}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mataPelajaran">Mata Pelajaran</Label>
                  <Select name="mataPelajaran" onValueChange={(value) => handleSelectChange('mataPelajaran', value)} value={formData.mataPelajaran}>
                    <SelectTrigger><SelectValue placeholder="Pilih Mata Pelajaran" /></SelectTrigger>
                    <SelectContent>
                      {kitabPelajaran?.filter(k => k.kelas === formData.kelas).map((mapel) => (
                            <SelectItem key={mapel.id} value={mapel.mataPelajaran}>[{mapel.kode}] {mapel.mataPelajaran}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guruId">Pengawas</Label>
                  <Select name="guruId" onValueChange={(value) => handleSelectChange('guruId', String(value))} value={String(formData.guruId)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Pengawas" /></SelectTrigger>
                    <SelectContent>
                      {teachers?.map(teacher => (
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
                  Jadwal ujian ini akan dihapus secara permanen. Aksi ini tidak dapat dibatalkan.
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
