
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
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
import { Jadwal, Guru, Kurikulum } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where, getDocs, Query } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyJadwal: Omit<Jadwal, 'id' | 'kurikulumId'> = {
  hari: 'Sabtu',
  kelas: '0',
  mataPelajaran: '',
  guruId: '',
  jam: '14:00 - 15:00',
  guruName: '',
  kitab: ''
};

const HARI_OPERASIONAL = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
const JAM_PELAJARAN = ['14:00 - 15:00', '15:30 - 16:30'];
const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

interface JadwalPelajaranProps {
  selectedKelas: string;
}

export default function JadwalPelajaranComponent({ selectedKelas }: JadwalPelajaranProps) {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [allSchedules, setAllSchedules] = useState<Jadwal[]>([]);
  const [isMultiLoading, setIsMultiLoading] = useState(false);
  
  const singleJadwalQuery = useMemoFirebase(() => {
    if (!firestore || !user || selectedKelas === 'all') return null;
    return query(collection(firestore, 'jadwal'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);

  const { data: singleJadwal, isLoading: singleJadwalLoading } = useCollection<Jadwal>(singleJadwalQuery);

  useEffect(() => {
    async function fetchAllSchedules() {
      if (selectedKelas !== 'all' || !firestore || !user) return;
      setIsMultiLoading(true);
      
      const allClassQueries = KELAS_OPTIONS.map(kelas => 
        getDocs(query(collection(firestore, 'jadwal'), where('kelas', '==', kelas)))
      );
      
      try {
        const allSnapshots = await Promise.all(allClassQueries);
        const combinedSchedules: Jadwal[] = [];
        allSnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            combinedSchedules.push({ id: doc.id, ...doc.data() } as Jadwal);
          });
        });
        setAllSchedules(combinedSchedules);
      } catch (error) {
        console.error("Error fetching all schedules: ", error);
        toast({ variant: 'destructive', title: 'Gagal Memuat Jadwal', description: 'Terjadi kesalahan saat memuat semua jadwal.' });
      } finally {
        setIsMultiLoading(false);
      }
    }
    fetchAllSchedules();
  }, [selectedKelas, firestore, user, toast]);

  const jadwal = useMemo(() => {
    return selectedKelas === 'all' ? allSchedules : singleJadwal;
  }, [selectedKelas, allSchedules, singleJadwal]);

  const isLoading = selectedKelas === 'all' ? isMultiLoading : singleJadwalLoading;
  
  const [teachers, setTeachers] = useState<Guru[]>([]);
  const [kitabPelajaran, setKitabPelajaran] = useState<Kurikulum[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [kurikulumLoading, setKurikulumLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jadwalToEdit, setJadwalToEdit] = useState<Jadwal | null>(null);
  const [jadwalToDelete, setJadwalToDelete] = useState<Jadwal | null>(null);
  const [formData, setFormData] = useState<Omit<Jadwal, 'id' | 'kurikulumId'>>(emptyJadwal);
  const [selectedHari, setSelectedHari] = useState('all');

  const jadwalByKelasHariJam = useMemo(() => {
    if (!jadwal) return {};
    const grouped: { [key: string]: Jadwal } = {};
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

  const loadTeachers = async () => {
    if (!firestore || teachers.length > 0) return;
    setTeachersLoading(true);
    try {
        const teachersQuery = query(collection(firestore, 'gurus'));
        const teachersSnapshot = await getDocs(teachersQuery);
        const teachersData = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guru));
        setTeachers(teachersData);
    } catch (error) {
        console.error("Failed to load teachers:", error);
        toast({ variant: 'destructive', title: 'Gagal Memuat Guru', description: 'Tidak dapat memuat daftar pengajar.' });
    } finally {
        setTeachersLoading(false);
    }
  };

  const loadKurikulum = async () => {
      if (!firestore || kitabPelajaran.length > 0) return;
      setKurikulumLoading(true);
      try {
          const kurikulumQuery = query(collection(firestore, 'kurikulum'));
          const kurikulumSnapshot = await getDocs(kurikulumQuery);
          const kurikulumData = kurikulumSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kurikulum));
          setKitabPelajaran(kurikulumData);
      } catch (error) {
          console.error("Failed to load curriculum:", error);
          toast({ variant: 'destructive', title: 'Gagal Memuat Mapel', description: 'Tidak dapat memuat daftar mata pelajaran.' });
      } finally {
          setKurikulumLoading(false);
      }
  };

  const handleOpenDialog = (item: Jadwal | null = null, defaults: Partial<Omit<Jadwal, 'id' | 'kurikulumId'>> = {}) => {
    if (!isAdmin || selectedKelas === 'all') return;
    setJadwalToEdit(item);
    if (item) {
      const { kurikulumId, ...rest } = item;
      setFormData({ ...rest });
    } else {
      setFormData({ ...emptyJadwal, kelas: selectedKelas, ...defaults });
    }
    setIsDialogOpen(true);
  };

  const handleSaveJadwal = () => {
    if (!firestore) return;
    const jadwalCollectionRef = collection(firestore, 'jadwal');
    if (formData.kelas && formData.mataPelajaran && formData.guruId && formData.jam && formData.hari) {
      
      const selectedTeacher = teachers.find(t => t.id === formData.guruId);
      const selectedKurikulum = kitabPelajaran.find(k => k.mataPelajaran === formData.mataPelajaran && k.kelas === formData.kelas);

      const dataToSave: Omit<Jadwal, 'id'> = {
        ...formData,
        guruName: selectedTeacher?.name || '',
        kitab: selectedKurikulum?.kitab || '',
        kurikulumId: selectedKurikulum?.id,
      };

      if (jadwalToEdit) {
        const jadwalDocRef = doc(firestore, 'jadwal', jadwalToEdit.id);
        updateDocumentNonBlocking(jadwalDocRef, dataToSave);
      } else {
        addDocumentNonBlocking(jadwalCollectionRef, dataToSave);
      }
      setIsDialogOpen(false);
      setJadwalToEdit(null);
    }
  };

  const handleDeleteJadwal = (item: Jadwal) => {
    if (!isAdmin) return;
    setJadwalToDelete(item);
  };
  
  const confirmDelete = () => {
    if (jadwalToDelete && firestore) {
        const jadwalDocRef = doc(firestore, 'jadwal', jadwalToDelete.id);
        deleteDocumentNonBlocking(jadwalDocRef);
        setJadwalToDelete(null);
    }
  };

  const getTeacherName = (guruName?: string) => {
    return guruName ? guruName.split(',')[0] : '...';
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const title = selectedKelas === 'all' 
      ? 'Jadwal Pelajaran - Semua Kelas'
      : `Jadwal Pelajaran - Kelas ${selectedKelas}`;
    doc.text(title, 20, 10);
    
    const head: any[] = [['Kelas', 'Hari', 'Jam', 'Pelajaran', 'Kitab', 'Guru']];
    const body: any[] = [];
    
    (jadwal || [])
      .sort((a,b) => Number(a.kelas) - Number(b.kelas) || HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari))
      .forEach(item => {
        body.push([
          `Kelas ${item.kelas}`,
          item.hari,
          item.jam,
          item.mataPelajaran,
          item.kitab,
          getTeacherName(item.guruName)
        ]);
    });

    doc.autoTable({ head, body });
    doc.save(`jadwal-pelajaran.pdf`);
  };

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
                                <p className="text-xs truncate text-muted-foreground" title={jadwalItem.guruName}>{jadwalItem.guruName}</p>
                                {isAdmin && selectedKelas !== 'all' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenDialog(jadwalItem)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleDeleteJadwal(jadwalItem)} className="text-red-500"><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center flex-grow">
                              {isAdmin && selectedKelas !== 'all' ? (
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
              <Button onClick={() => handleOpenDialog()} size="sm" disabled={selectedKelas === 'all'}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal
              </Button>
          )}
          <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={!jadwal || jadwal.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
          </Button>
        </div>
        <div className="flex gap-4">
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
      
      {isLoading ? (
         <p className="text-center mt-8">Memuat jadwal...</p>
      ) : (
         <div>
          {selectedKelas === 'all' ? (
            KELAS_OPTIONS.map(kelas => renderInteractiveGrid(kelas))
          ) : (jadwal && jadwal.length > 0) || (isAdmin && selectedKelas !== 'all') ? (
              renderInteractiveGrid(selectedKelas)
          ) : (
              <p className="text-center text-muted-foreground mt-8">Tidak ada jadwal untuk kelas ini.</p>
          )}
         </div>
      )}

      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{jadwalToEdit ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
                <DialogDescription>
                  {jadwalToEdit ? 'Perbarui informasi jadwal di bawah ini.' : `Isi formulir untuk menambahkan jadwal baru.`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="space-y-2">
                  <Label htmlFor="kelas">Kelas</Label>
                  <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={formData.kelas}>
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
                  <Select name="mataPelajaran" onValueChange={(value) => handleSelectChange('mataPelajaran', value)} value={formData.mataPelajaran} disabled={kurikulumLoading}>
                    <SelectTrigger onPointerDown={loadKurikulum}><SelectValue placeholder={kurikulumLoading ? 'Memuat...' : 'Pilih Mata Pelajaran'} /></SelectTrigger>
                    <SelectContent>
                      {kitabPelajaran?.filter(k => k.kelas === formData.kelas).map((mapel) => (
                            <SelectItem key={mapel.id} value={mapel.mataPelajaran}>[{mapel.kode}] {mapel.mataPelajaran}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guruId">Guru</Label>
                  <Select name="guruId" onValueChange={(value) => handleSelectChange('guruId', String(value))} value={String(formData.guruId)} disabled={teachersLoading}>
                    <SelectTrigger onPointerDown={loadTeachers}><SelectValue placeholder={teachersLoading ? 'Memuat...' : 'Pilih Guru'} /></SelectTrigger>
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
                  Jadwal untuk kelas {jadwalToDelete?.kelas} pada hari {jadwalToDelete?.hari} akan dihapus. Aksi ini tidak dapat dibatalkan.
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

    