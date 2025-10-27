
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

  const jadwalByKelasHariJam = useMemo(() => {
    if (!jadwal) return {};
    const grouped: { [key: string]: Jadwal } = {};
    jadwal.forEach(item => {
      const key = `${item.kelas}-${item.hari}-${item.jam}`;
      grouped[key] = item;
    });
    return grouped;
  }, [jadwal]);

  const filteredJadwalForTable = useMemo(() => {
    if (!jadwal) return [];
    const filtered = selectedKelas === 'all'
      ? jadwal
      : jadwal.filter(item => item.kelas === selectedKelas);
    
    return filtered.sort((a,b) => Number(a.kelas) - Number(b.kelas) || HARI_OPERASIONAL.indexOf(a.hari) - HARI_OPERASIONAL.indexOf(b.hari) || a.jam.localeCompare(b.jam));
  }, [jadwal, selectedKelas]);

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = (item: Jadwal | null = null, defaults: Partial<Omit<Jadwal, 'id'>> = {}) => {
    if (!isAdmin) return;
    setJadwalToEdit(item);
    if (item) {
      setFormData({ ...item });
    } else {
      const defaultKelas = selectedKelas === 'all' ? '0' : selectedKelas;
      setFormData({ ...emptyJadwal, kelas: defaultKelas, ...defaults });
    }
    setIsDialogOpen(true);
  };

  const handleSaveJadwal = () => {
    if (formData.kelas && formData.mataPelajaran && formData.guruId && formData.jam && formData.hari && jadwalRef) {
      const dataToSave = { ...formData };
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
    
    filteredJadwalForTable.forEach(item => {
      body.push([`Kelas ${item.kelas}`, item.hari, item.jam, item.mataPelajaran, getTeacherName(item.guruId)]);
    });

    doc.autoTable({
      head: [['Kelas', 'Hari', 'Jam', 'Mata Pelajaran', 'Guru']],
      body: body,
    });
    
    doc.save(`jadwal-pelajaran-kelas-${selectedKelas}.pdf`);
  };

  const isLoading = jadwalLoading || teachersLoading || kurikulumLoading;
  
  const renderInteractiveGrid = () => {
    if (isLoading) return <p className="text-center">Loading...</p>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {HARI_OPERASIONAL.map(hari => (
          <Card key={hari}>
            <CardContent className="p-4">
              <h3 className="font-headline text-lg font-bold text-center mb-4">{hari}</h3>
              <div className="space-y-2">
                {JAM_PELAJARAN.map(jam => {
                  const key = `${selectedKelas}-${hari}-${jam}`;
                  const jadwalItem = jadwalByKelasHariJam[key];
                  return (
                    <div key={jam} className="border rounded-lg p-3 min-h-[90px] flex flex-col justify-between bg-muted/20">
                      <p className="text-sm font-semibold text-muted-foreground">{jam}</p>
                      {jadwalItem ? (
                        <div>
                          <p className="font-bold text-primary">{jadwalItem.mataPelajaran}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs">{getTeacherName(jadwalItem.guruId)}</p>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
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
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(null, { hari, jam })}>
                              <PlusCircle className="h-6 w-6 text-muted-foreground" />
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const renderTable = () => {
     return (
        <div className="border rounded-lg overflow-hidden bg-card">
            <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="font-headline">Kelas</TableHead>
                    <TableHead className="font-headline">Hari</TableHead>
                    <TableHead className="font-headline">Jam</TableHead>
                    <TableHead className="font-headline">Mata Pelajaran</TableHead>
                    <TableHead className="font-headline">Guru</TableHead>
                    {isAdmin && <TableHead className="text-right font-headline">Aksi</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center">Loading...</TableCell></TableRow>}
                    {filteredJadwalForTable.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>Kelas {item.kelas}</TableCell>
                        <TableCell>{item.hari}</TableCell>
                        <TableCell>{item.jam}</TableCell>
                        <TableCell>{item.mataPelajaran}</TableCell>
                        <TableCell>{getTeacherName(item.guruId)}</TableCell>
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
                                <DropdownMenuItem
                                onClick={() => handleDeleteJadwal(item)}
                                className="text-red-600"
                                >
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
        </div>
     )
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
              Kelola jadwal pelajaran untuk setiap kelas. Pilih kelas untuk tampilan interaktif.
            </p>
          </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
                <Button onClick={() => handleOpenDialog()} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal
                </Button>
            )}
            <Button onClick={handleExportPdf} variant="outline" size="sm" disabled={selectedKelas === 'all'}>
                <FileDown className="mr-2 h-4 w-4" />
                Ekspor PDF
            </Button>
           </div>
        </div>

        <div className="mb-6 flex justify-end">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-[180px]">
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
        
        {selectedKelas === 'all' ? renderTable() : renderInteractiveGrid()}
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
                  <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={formData.kelas} disabled={selectedKelas !== 'all'}>
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
