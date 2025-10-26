
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
import { Kurikulum as Kitab } from '@/lib/data';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyKurikulum: Omit<Kitab, 'id'> = {
  kelas: '0',
  mataPelajaran: '',
  kitab: ''
};

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function KurikulumPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const kurikulumRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'kurikulum');
  }, [firestore, user]);
  const { data: kitabPelajaran, isLoading } = useCollection<Kitab>(kurikulumRef);
  const { isAdmin } = useAdmin();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [kurikulumToEdit, setKurikulumToEdit] = useState<Kitab | null>(null);
  const [kurikulumToDelete, setKurikulumToDelete] = useState<Kitab | null>(null);
  const [formData, setFormData] = useState(emptyKurikulum);
  const [selectedKelas, setSelectedKelas] = useState('all');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = (item: Kitab | null = null) => {
    if (!isAdmin) return;
    setKurikulumToEdit(item);
    setFormData(item ? { kelas: item.kelas, mataPelajaran: item.mataPelajaran, kitab: item.kitab } : emptyKurikulum);
    setIsDialogOpen(true);
  };

  const handleSaveKurikulum = () => {
    if (formData.kelas && formData.mataPelajaran && formData.kitab && kurikulumRef) {
      if (kurikulumToEdit) {
        const kurikulumDocRef = doc(firestore, 'kurikulum', kurikulumToEdit.id);
        updateDocumentNonBlocking(kurikulumDocRef, formData);
      } else {
        addDocumentNonBlocking(kurikulumRef, formData);
      }
      setIsDialogOpen(false);
      setKurikulumToEdit(null);
    }
  };

  const handleDeleteKurikulum = (item: Kitab) => {
    if (!isAdmin) return;
    setKurikulumToDelete(item);
  };

  const confirmDelete = () => {
    if (kurikulumToDelete) {
      const kurikulumDocRef = doc(firestore, 'kurikulum', kurikulumToDelete.id);
      deleteDocumentNonBlocking(kurikulumDocRef);
      setKurikulumToDelete(null);
    }
  };

  const filteredKitabPelajaran = useMemo(() => {
    if (!kitabPelajaran) return [];
    if (selectedKelas === 'all') {
      return kitabPelajaran;
    }
    return kitabPelajaran.filter(item => item.kelas === selectedKelas);
  }, [kitabPelajaran, selectedKelas]);

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Kurikulum', 20, 10);
    doc.autoTable({
      head: [['Kelas', 'Mata Pelajaran', 'Kitab']],
      body: filteredKitabPelajaran.map((item: Kitab) => [`Kelas ${item.kelas}`, item.mataPelajaran, item.kitab]),
    });
    doc.save('data-kurikulum.pdf');
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Mata Pelajaran & Kitab
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Daftar kitab yang dipelajari dalam kurikulum kami untuk setiap
              jenjang kelas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button onClick={() => handleOpenDialog()} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kurikulum
              </Button>
            )}
            <Button onClick={handleExportPdf} variant="outline" size="sm">
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


        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] font-headline">Kelas</TableHead>
                <TableHead className="font-headline">Mata Pelajaran</TableHead>
                <TableHead className="font-headline">Kitab</TableHead>
                {isAdmin && <TableHead className="font-headline text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={isAdmin ? 4 : 3}>Loading...</TableCell></TableRow>}
              {filteredKitabPelajaran.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">Kelas {item.kelas}</TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>{item.kitab}</TableCell>
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
                            onClick={() => handleDeleteKurikulum(item)}
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
      
      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{kurikulumToEdit ? 'Edit Kurikulum' : 'Tambah Data Kurikulum'}</DialogTitle>
                <DialogDescription>
                  {kurikulumToEdit ? 'Perbarui informasi kurikulum.' : 'Isi formulir di bawah ini untuk menambahkan data kurikulum baru.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="kelas" className="text-right">
                    Kelas
                  </Label>
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
                  <Label htmlFor="mataPelajaran" className="text-right">
                    Mata Pelajaran
                  </Label>
                  <Input id="mataPelajaran" name="mataPelajaran" value={formData.mataPelajaran} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="kitab" className="text-right">
                    Kitab
                  </Label>
                  <Input id="kitab" name="kitab" value={formData.kitab} onChange={handleInputChange} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" onClick={handleSaveKurikulum}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog open={!!kurikulumToDelete} onOpenChange={() => setKurikulumToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                <AlertDialogDescription>
                  Kurikulum "{kurikulumToDelete?.mataPelajaran}" akan dihapus secara permanen. Aksi ini tidak dapat dibatalkan.
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
