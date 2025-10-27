
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Jadwal, Guru, Kurikulum } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';


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

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = (item: Jadwal | null = null, defaultData: Partial<Omit<Jadwal, 'id'>> = {}) => {
    if (!isAdmin) return;
    setJadwalToEdit(item);
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({ ...emptyJadwal, kelas: selectedKelas === 'all' ? '0' : selectedKelas, ...defaultData });
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
    if (jadwalToDelete) {
        const jadwalDocRef = doc(firestore, 'jadwal', jadwalToDelete.id);
        deleteDocumentNonBlocking(jadwalDocRef);
        setJadwalToDelete(null);
    }
  };

  const getTeacherName = (guruId: string) => {
    const teacher = teachers?.find(t => t.id === guruId);
    return teacher ? teacher.name.split(',')[0] : 'N/A';
  };

  const jadwalByCompositeKey = useMemo(() => {
    if (!jadwal) return {};
    return jadwal.reduce((acc, item) => {
      const key = `${item.kelas}-${item.jam}-${item.hari}`;
      acc[key] = item;
      return acc;
    }, {} as Record<string, Jadwal>);
  }, [jadwal]);

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const dataJadwal = jadwal || [];
    
    if (selectedKelas === 'all') {
        doc.text(`Jadwal Pelajaran - Semua Kelas`, 20, 10);
        let firstPage = true;
        KELAS_OPTIONS.forEach(kelas => {
            const dataToExport = dataJadwal.filter(j => j.kelas === kelas).sort((a,b) => HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari) || a.jam.localeCompare(b.jam));
            if(dataToExport.length > 0) {
                if (!firstPage) {
                    doc.addPage();
                }
                doc.autoTable({
                    head: [['Hari', 'Jam', 'Keterangan', 'Mata Pelajaran', 'Guru']],
                    body: dataToExport.map((item: Jadwal) => [
                        item.hari,
                        item.jam,
                        item.jam === JAM_PELAJARAN[0] ? 'Jam Pertama' : 'Jam Kedua',
                        item.mataPelajaran,
                        getTeacherName(item.guruId),
                    ]),
                    startY: firstPage ? 20 : doc.autoTable.previous.finalY + 20,
                    pageBreak: 'auto',
                    headStyles: { fillColor: [22, 163, 74] },
                    didDrawPage: function(data) {
                        doc.text(`Jadwal Pelajaran - Kelas ${kelas}`, 20, data.cursor.y - (data.row.height * (data.row.index + 1 )) - 10 );
                    }
                });
                firstPage = false;
            }
        });
    } else {
        const dataToExport = dataJadwal.filter(j => j.kelas === selectedKelas).sort((a,b) => HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari) || a.jam.localeCompare(b.jam));
        doc.text(`Jadwal Pelajaran - Kelas ${selectedKelas}`, 20, 10);
        doc.autoTable({
            head: [['Hari', 'Jam', 'Keterangan', 'Mata Pelajaran', 'Guru']],
            body: dataToExport.map((item: Jadwal) => [
                item.hari,
                item.jam,
                item.jam === JAM_PELAJARAN[0] ? 'Jam Pertama' : 'Jam Kedua',
                item.mataPelajaran,
                getTeacherName(item.guruId),
            ]),
        });
    }
    
    doc.save(`jadwal-pelajaran.pdf`);
  };

  const renderJadwalGrid = (kelasOptions: string[]) => {
    return (
      <div className="relative w-full overflow-auto">
        <div className="grid grid-cols-8 gap-px bg-border rounded-lg border overflow-hidden min-w-[1000px]">
          {/* Header */}
          <div className="bg-card p-2 text-center font-headline font-semibold text-muted-foreground">Waktu</div>
          <div className="bg-card p-2 text-center font-headline font-semibold text-muted-foreground">Kelas</div>
          {HARI_OPERASIONAL.map(hari => (
            <div key={hari} className="bg-card p-2 text-center font-headline font-semibold text-muted-foreground">{hari}</div>
          ))}
          
          {/* Rows */}
          {JAM_PELAJARAN.map((jam, jamIndex) => (
            kelasOptions.map((kelas, kelasIndex) => (
                <React.Fragment key={`${jam}-${kelas}`}>
                    {kelasIndex === 0 && (
                        <div className={cn("p-2 text-center font-semibold flex items-center justify-center", jamIndex % 2 === 0 ? "bg-card" : "bg-muted/50")} rowSpan={kelasOptions.length}>
                            <div>
                                <p>{jam}</p>
                                <p className="text-xs font-normal text-muted-foreground">{jamIndex === 0 ? 'Jam Pertama' : 'Jam Kedua'}</p>
                            </div>
                        </div>
                    )}
                    <div className={cn("p-2 font-semibold flex items-center justify-center text-sm", (jamIndex * kelasOptions.length + kelasIndex) % 2 === 0 ? "bg-card" : "bg-muted/50")}>
                        {kelas}
                    </div>

                    {HARI_OPERASIONAL.map(hari => {
                        const compositeKey = `${kelas}-${jam}-${hari}`;
                        const itemJadwal = jadwalByCompositeKey[compositeKey];
                        return (
                            <div key={`${hari}-${jam}-${kelas}`} className={cn("p-2 min-h-[100px]", (jamIndex * kelasOptions.length + kelasIndex) % 2 === 0 ? "bg-card" : "bg-muted/50")}>
                                {itemJadwal ? (
                                <Card className="h-full flex flex-col justify-between bg-secondary/30 group relative">
                                    <CardHeader className="p-2 pb-0">
                                        <CardTitle className="text-sm font-semibold">{itemJadwal.mataPelajaran}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-2 text-xs text-muted-foreground">
                                        <p>{getTeacherName(itemJadwal.guruId)}</p>
                                    </CardContent>
                                    {isAdmin && (
                                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-6 w-6 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenDialog(itemJadwal)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                onClick={() => handleDeleteJadwal(itemJadwal)}
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
                                    <Button variant="outline" className="h-full w-full" onClick={() => handleOpenDialog(null, { hari, jam, kelas })}>
                                    <PlusCircle className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                ) : (
                                    <div className="h-full w-full"></div>
                                )
                                )}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))
          ))}
        </div>
      </div>
    );
  };

  if (jadwalLoading || teachersLoading || kurikulumLoading) {
    return <div className="container py-12 md:py-20 text-center">Loading...</div>
  }

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Jadwal Pelajaran
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Lihat dan kelola jadwal pelajaran untuk semua kelas secara interaktif.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button onClick={() => handleOpenDialog(null, { kelas: selectedKelas === 'all' ? '0' : selectedKelas })} size="sm">
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
                        <SelectValue placeholder="Filter Kelas" />
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
        
        {renderJadwalGrid(selectedKelas === 'all' ? KELAS_OPTIONS : [selectedKelas])}
        
      </div>
      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{jadwalToEdit ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</DialogTitle>
                <DialogDescription>
                  {jadwalToEdit ? 'Perbarui informasi jadwal di bawah ini.' : 'Isi formulir di bawah untuk menambahkan jadwal baru.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
