
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
import { kitabPelajaran as initialKitabPelajaran } from '@/lib/data';
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

type Kitab = {
  id: number;
  kelas: string;
  mataPelajaran: string;
  kitab: string;
};

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
  const [kitabPelajaran, setKitabPelajaran] = useState<Kitab[]>(
    initialKitabPelajaran.map((k, i) => ({ ...k, id: i + 1 }))
  );
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
    setKurikulumToEdit(item);
    setFormData(item ? { kelas: item.kelas, mataPelajaran: item.mataPelajaran, kitab: item.kitab } : emptyKurikulum);
    setIsDialogOpen(true);
  };

  const handleSaveKurikulum = () => {
    if (formData.kelas && formData.mataPelajaran && formData.kitab) {
      if (kurikulumToEdit) {
        // Edit
        setKitabPelajaran(prev => prev.map(k => k.id === kurikulumToEdit.id ? { ...k, ...formData } : k));
      } else {
        // Add
        const newEntry: Kitab = {
          id: kitabPelajaran.length > 0 ? Math.max(...kitabPelajaran.map(k => k.id)) + 1 : 1,
          ...formData,
        };
        setKitabPelajaran(prev => [...prev, newEntry]);
      }
      setIsDialogOpen(false);
      setKurikulumToEdit(null);
    }
  };

  const handleDeleteKurikulum = (item: Kitab) => {
    setKurikulumToDelete(item);
  };

  const confirmDelete = () => {
    if (kurikulumToDelete) {
      setKitabPelajaran(prev => prev.filter(k => k.id !== kurikulumToDelete.id));
      setKurikulumToDelete(null);
    }
  };

  const filteredKitabPelajaran = useMemo(() => {
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

  const availableKelas = useMemo(() => {
    const kelasSet = new Set(kitabPelajaran.map(k => k.kelas));
    return Array.from(kelasSet).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
 }, [kitabPelajaran]);

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
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:brightness-110">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kurikulum
            </Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
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
                <TableHead className="font-headline text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKitabPelajaran.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">Kelas {item.kelas}</TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>{item.kitab}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

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
            <Button type="submit" onClick={handleSaveKurikulum} className="bg-gradient-primary text-primary-foreground hover:brightness-110">Simpan</Button>
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
    </div>
  );
}
