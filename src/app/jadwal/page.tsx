
'use client';

import React, { useState, useMemo } from 'react';
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
import { collection, doc } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Card, CardContent } from '@/components/ui/card';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyJadwal: Omit<Jadwal, 'id'> = {
  hari: 'Sabtu',
  kelas: '0',
  mataPelajaran: '',
  guruId: '',
  jam: '14:00 - 15:00',
};

const HARI_OPERASIONAL = ['Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
const JAM_PELAJARAN = ['14:00 - 15:00', '15:30 - 16:30'];
const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function JadwalPage() {
  const firestore = useFirestore();
  const { isAdmin } = useAdmin();
  const { user } = useUser();
  
  const jadwalRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'jadwal');
  }, [firestore, user]);
  const { data: jadwal, isLoading: jadwalLoading } = useCollection<Jadwal>(jadwalRef);

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
  const [jadwalToEdit, setJadwalToEdit] = useState<Jadwal | null>(null);
  const [jadwalToDelete, setJadwalToDelete] = useState<Jadwal | null>(null);
  const [formData, setFormData] = useState<Omit<Jadwal, 'id'>>(emptyJadwal);

  const [selectedKelas, setSelectedKelas] = useState('all');

  const jadwalGrid = useMemo(() => {
    if (!jadwal) return {};
    const grid: { [key: string]: Jadwal } = {};
    const filtered = selectedKelas === 'all'
      ? jadwal
      : jadwal.filter(item => item.kelas === selectedKelas);

    filtered.forEach(item => {
      const key = `${item.kelas}-${item.hari}-${item.jam}`;
      grid[key] = item;
    });

    return grid;
  }, [jadwal, selectedKelas]);

  const classesToDisplay = useMemo(() => {
    return selectedKelas === 'all' ? KELAS_OPTIONS : [selectedKelas];
  }, [selectedKelas]);


  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = (item: Jadwal | null = null, defaultData: Partial<Omit<Jadwal, 'id'>> = {}) => {
    if (!isAdmin) return;
    setJadwalToEdit(item);
    if (item) {
      setFormData({ ...item });
    } else {
      const defaultKelas = selectedKelas === 'all' ? '0' : selectedKelas;
      setFormData({ ...emptyJadwal, kelas: defaultKelas, ...defaultData });
    }
    setIsDialogOpen(true);
  };

  const handleSaveJadwal = () => {
    if (formData.kelas && formData.mataPelajaran && formData.guruId && formData.jam && formData.hari && jadwalRef) {
      const dataToSave = { ...formData, guruId: formData.guruId };
      if (jadwalToEdit) {
        const jadwalDocRef = doc(firestore, 'jadwal', jadwalToEdit.id);
        updateDocumentNonBlocking(jadwalDocRef, dataToSave);
      } else {
        addDocumentNonBlocking(jadwalRef, dataToSave);
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

  const getTeacherName = (guruId: string) => {
    const teacher = teachers?.find(t => t.id === guruId);
    return teacher ? teacher.name.split(',')[0] : 'N/A';
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text(`Jadwal Pelajaran - ${selectedKelas === 'all' ? 'Semua Kelas' : `Kelas ${selectedKelas}`}`, 20, 10);
    const body: any[] = [];
    
    if (selectedKelas === 'all') {
      const sortedJadwal = [...(jadwal || [])].sort((a,b) => Number(a.kelas) - Number(b.kelas) || HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari) || a.jam.localeCompare(b.jam));
      sortedJadwal.forEach(item => {
        body.push([`Kelas ${item.kelas}`, item.hari, item.jam, item.mataPelajaran, getTeacherName(item.guruId)]);
      });
      doc.autoTable({
        head: [['Kelas', 'Hari', 'Jam', 'Mata Pelajaran', 'Guru']],
        body: body,
      });
    } else {
      JAM_PELAJARAN.forEach(jam => {
          HARI_OPERASIONAL.forEach(hari => {
              const item = jadwalGrid[`${selectedKelas}-${hari}-${jam}`];
              if (item) {
                   body.push([hari, jam, item.mataPelajaran, getTeacherName(item.guruId)]);
              }
          });
      });
      doc.autoTable({
          head: [['Hari', 'Jam', 'Mata Pelajaran', 'Guru']],
          body: body,
      });
    }
    
    doc.save(`jadwal-pelajaran-kelas-${selectedKelas}.pdf`);
  };

  const isLoading = jadwalLoading || teachersLoading || kurikulumLoading;

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Jadwal Pelajaran Interaktif
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola jadwal pelajaran untuk setiap kelas dalam tampilan grid yang mudah digunakan.
            </p>
          </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
                <Button onClick={() => handleOpenDialog()} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal
                </Button>
            )}
            <Button onClick={handleExportPdf} variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Ekspor PDF
            </Button>
           </div>
        </div>

        <div className="mb-6 flex justify-start gap-4">
            <div className='w-full sm:w-[240px]'>
                <Label className="text-sm font-medium">Pilih Kelas</Label>
                <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                    <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Kelas</SelectItem>
                        {KELAS_OPTIONS.map(kelas => (
                            <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="border rounded-lg overflow-hidden bg-card">
            <div className="relative w-full overflow-auto">
              <div 
                className="grid"
                style={{
                  gridTemplateColumns: `minmax(120px, auto) repeat(${HARI_OPERASIONAL.length * JAM_PELAJARAN.length}, minmax(180px, 1fr))`
                }}
              >
                 {/* Header Row */}
                 <div className="p-3 font-headline text-muted-foreground border-b border-r sticky left-0 bg-card z-20">Kelas</div>
                 {HARI_OPERASIONAL.map(hari => (
                  <div key={hari} className="p-3 font-headline text-center text-muted-foreground border-b" colSpan={JAM_PELAJARAN.length}>{hari}</div>
                 ))}
                 
                 {/* Sub-header Row for Jam */}
                 <div className="p-3 font-headline text-muted-foreground border-b border-r sticky left-0 bg-card z-20"></div>
                 {HARI_OPERASIONAL.map(hari => (
                   <React.Fragment key={`subheader-${hari}`}>
                      {JAM_PELAJARAN.map(jam => (
                         <div key={`${hari}-${jam}`} className="p-3 font-medium text-center border-b">{jam}</div>
                      ))}
                   </React.Fragment>
                 ))}

                {/* Data Rows */}
                {classesToDisplay.map(kelas => (
                  <React.Fragment key={kelas}>
                    <div className="p-3 font-medium border-r sticky left-0 bg-card z-10 flex items-center justify-center text-center">Kelas {kelas}</div>
                    {HARI_OPERASIONAL.map(hari => 
                      <React.Fragment key={`${kelas}-${hari}`}>
                        {JAM_PELAJARAN.map(jam => {
                           const item = jadwalGrid[`${kelas}-${hari}-${jam}`];
                           return (
                            <div key={`${kelas}-${hari}-${jam}`} className="border-b p-2 min-h-[100px] flex items-center justify-center">
                              {isLoading ? <p className='text-xs'>...</p> : item ? (
                                <Card className="w-full h-full shadow-md bg-secondary/50 relative group">
                                  <CardContent className="p-3 text-center flex flex-col justify-center items-center h-full">
                                      <p className="font-bold text-sm text-secondary-foreground">{item.mataPelajaran}</p>
                                      <p className="text-xs text-muted-foreground mt-1">{getTeacherName(item.guruId)}</p>
                                  </CardContent>
                                  {isAdmin && (
                                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" className="h-7 w-7 p-0">
                                                  <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                                                  <Pencil className="mr-2 h-4 w-4" />
                                                  <span>Edit</span>
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                  onClick={() => handleDeleteJadwal(item)}
                                                  className="text-red-600"
                                              >
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  <span>Hapus</span>
                                              </DropdownMenuItem>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                      </div>
                                  )}
                                </Card>
                              ) : (
                                  isAdmin ? (
                                      <Button variant="ghost" size="icon" className="w-full h-full" onClick={() => handleOpenDialog(null, { kelas, hari, jam })}>
                                          <PlusCircle className="h-6 w-6 text-muted-foreground/50" />
                                      </Button>
                                  ) : <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                           )
                        })}
                      </React.Fragment>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
      </div>
      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{jadwalToEdit ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
                <DialogDescription>
                  {jadwalToEdit ? 'Perbarui informasi jadwal di bawah ini.' : `Isi formulir untuk menambahkan jadwal baru.`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="kelas" className="text-right">Kelas</Label>
                  <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={formData.kelas}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {KELAS_OPTIONS.map(kelas => (
                            <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hari" className="text-right">Hari</Label>
                  <Select name="hari" onValueChange={(value) => handleSelectChange('hari', value)} value={formData.hari}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih Hari" />
                    </SelectTrigger>
                    <SelectContent>
                      {HARI_OPERASIONAL.map(hari => (
                            <SelectItem key={hari} value={hari}>{hari}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="jam" className="text-right">Jam</Label>
                  <Select name="jam" onValueChange={(value) => handleSelectChange('jam', value)} value={formData.jam}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih Jam" />
                    </SelectTrigger>
                    <SelectContent>
                      {JAM_PELAJARAN.map(jam => (
                            <SelectItem key={jam} value={jam}>{jam}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="mataPelajaran" className="text-right">Mata Pelajaran</Label>
                  <Select name="mataPelajaran" onValueChange={(value) => handleSelectChange('mataPelajaran', value)} value={formData.mataPelajaran}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih Mata Pelajaran" />
                    </SelectTrigger>
                    <SelectContent>
                      {kitabPelajaran?.filter(k => k.kelas === formData.kelas).map((mapel) => (
                            <SelectItem key={mapel.id} value={mapel.mataPelajaran}>{mapel.mataPelajaran} ({mapel.kitab})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="guruId" className="text-right">Guru</Label>
                  <Select name="guruId" onValueChange={(value) => handleSelectChange('guruId', String(value))} value={String(formData.guruId)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Pilih Guru" />
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
    </div>
  );
}

    