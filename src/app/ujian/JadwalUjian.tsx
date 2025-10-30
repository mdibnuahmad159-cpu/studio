
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
import { collection, doc, query, where } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyJadwal: Omit<JadwalUjian, 'id'> = {
  hari: 'Sabtu',
  kelas: '0',
  mataPelajaran: '',
  guruId: '',
  jam: '14:00 - 15:00',
};

const HARI_OPERASIONAL = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
const JAM_PELAJARAN = ['14:00 - 15:00', '15:30 - 16:30'];
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
  const { data: jadwal, isLoading: jadwalLoading } = useCollection<JadwalUjian>(jadwalUjianRef);

  const teachersRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'gurus');
  }, [firestore, user]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Guru>(teachersRef);
  
  const kurikulumRef = useMemoFirebase(() => {
    if (!user || !selectedKelas) return null;
    return query(collection(firestore, 'kurikulum'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: kitabPelajaran, isLoading: kurikulumLoading } = useCollection<Kurikulum>(kurikulumRef);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jadwalToEdit, setJadwalToEdit] = useState<JadwalUjian | null>(null);
  const [jadwalToDelete, setJadwalToDelete] = useState<JadwalUjian | null>(null);
  const [formData, setFormData] = useState<Omit<JadwalUjian, 'id'>>(emptyJadwal);
  const [selectedHari, setSelectedHari] = useState('all');

  const jadwalByKelasHariJam = useMemo(() => {
    if (!jadwal) return {};
    const grouped: { [key: string]: JadwalUjian } = {};
    jadwal.forEach(item => {
      const key = `${item.kelas}-${item.hari}-${item.jam}`;
      grouped[key] = item;
    });
    return grouped;
  }, [jadwal]);

  const filteredHariOperasional = useMemo(() => {
    if (selectedHari === 'all') {
      return HARI_OPERASIONAL;
    }
    return [selectedHari];
  }, [selectedHari]);
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = (item: JadwalUjian | null = null, defaults: Partial<Omit<JadwalUjian, 'id'>> = {}) => {
    if (!isAdmin) return;
    setJadwalToEdit(item);
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({ ...emptyJadwal, ...defaults });
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

  const getTeacherName = (guruId: string) => {
    const teacher = teachers?.find(t => t.id === guruId);
    return teacher ? teacher.name.split(',')[0] : 'N/A';
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text(`Jadwal Ujian - Kelas ${selectedKelas}`, 20, 10);
    
    const head: any[] = [['Hari', 'Jam', 'Pelajaran', 'Pengawas']];
    const body: any[] = [];
    
    let jadwalToExport = jadwal;

    if (selectedHari !== 'all') {
      jadwalToExport = jadwalToExport?.filter(j => j.hari === selectedHari);
    }

    (jadwalToExport || [])
      .sort((a,b) => HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari))
      .forEach(item => {
        body.push([
          item.hari,
          item.jam,
          item.mataPelajaran,
          getTeacherName(item.guruId)
        ]);
    });

    doc.autoTable({ head, body });
    doc.save(`jadwal-ujian-kelas-${selectedKelas}.pdf`);
  };

  const isLoading = jadwalLoading || teachersLoading || kurikulumLoading;
  
  const renderInteractiveGrid = (kelas: string) => {
    return (
      <Card key={kelas} className="mb-8 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-primary">Kelas {kelas}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto -m-2 p-2">
            <div className="flex space-x-4 pb-2">
              {filteredHariOperasional.map(hari => (
                <div key={hari} className="rounded-lg p-4 flex-shrink-0 w-48 bg-muted/30 shadow-inner">
                  <h3 className="font-headline text-lg font-bold text-center mb-4">{hari}</h3>
                  <div className="space-y-2">
                    {JAM_PELAJARAN.map(jam => {
                      const key = `${kelas}-${hari}-${jam}`;
                      const jadwalItem = jadwalByKelasHariJam[key];
                      return (
                        <div key={jam} className="border rounded-lg p-3 min-h-[90px] flex flex-col justify-between bg-card shadow-sm transition-shadow hover:shadow-md">
                          <p className="text-xs font-semibold text-muted-foreground">{jam}</p>
                          {jadwalItem ? (
                            <div className="mt-1">
                              <p className="font-bold text-sm text-primary truncate" title={jadwalItem.mataPelajaran}>{jadwalItem.mataPelajaran}</p>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs truncate text-muted-foreground" title={getTeacherName(jadwalItem.guruId)}>{getTeacherName(jadwalItem.guruId)}</p>
                                {isAdmin && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenDialog(jadwalItem)}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteJadwal(jadwalItem)} className="text-red-500">
                                        <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center flex-grow">
                              {isAdmin ? (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(null, { kelas, hari, jam })}>
                                  <PlusCircle className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                                </Button>
                              ) : <span className="text-xs text-muted-foreground">-</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isAdmin && (
              <Button onClick={() => handleOpenDialog(null, { kelas: selectedKelas })} size="sm" disabled={!selectedKelas}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal Ujian
              </Button>
          )}
          <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={!jadwal || jadwal.length === 0}>
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
            <Select value={selectedHari} onValueChange={setSelectedHari}>
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
      
      {isLoading && selectedKelas ? (
         <p className="text-center">Loading...</p>
      ) : !selectedKelas ? (
        <p className="text-center text-muted-foreground mt-8">Silakan pilih kelas terlebih dahulu untuk melihat atau menambah jadwal ujian.</p>
      ) : (
         <div>
          {jadwal && jadwal.length > 0 ? 
            renderInteractiveGrid(selectedKelas) :
            <p className="text-center text-muted-foreground mt-8">Tidak ada jadwal ujian untuk ditampilkan berdasarkan filter yang dipilih.</p>
          }
         </div>
      )}

      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{jadwalToEdit ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian Baru'}</DialogTitle>
                <DialogDescription>
                  {jadwalToEdit ? 'Perbarui informasi jadwal ujian di bawah ini.' : `Isi formulir untuk menambahkan jadwal ujian baru untuk Kelas ${formData.kelas}.`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas</Label>
                  <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={formData.kelas} disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {KELAS_OPTIONS.map(kelas => (
                            <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hari">Hari</Label>
                  <Select name="hari" onValueChange={(value) => handleSelectChange('hari', value)} value={formData.hari}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Hari" />
                    </SelectTrigger>
                    <SelectContent>
                      {HARI_OPERASIONAL.map(hari => (
                            <SelectItem key={hari} value={hari}>{hari}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jam">Jam</Label>
                  <Select name="jam" onValueChange={(value) => handleSelectChange('jam', value)} value={formData.jam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jam" />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mata Pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {kitabPelajaran?.map((mapel) => (
                            <SelectItem key={mapel.id} value={mapel.mataPelajaran}>[{mapel.kode}] {mapel.mataPelajaran}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guruId">Pengawas</Label>
                  <Select name="guruId" onValueChange={(value) => handleSelectChange('guruId', String(value))} value={String(formData.guruId)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Pengawas" />
                    </SelectTrigger>
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
                  Jadwal ujian untuk kelas {jadwalToDelete?.kelas} pada hari {jadwalToDelete?.hari} akan dihapus. Aksi ini tidak dapat dibatalkan.
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

    