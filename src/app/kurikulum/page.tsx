
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
import { Kurikulum as Kitab } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { FileDown, PlusCircle, MoreHorizontal, Pencil, Trash2, Upload } from 'lucide-react';
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
import * as XLSX from 'xlsx';
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [kurikulumToEdit, setKurikulumToEdit] = useState<Kitab | null>(null);
  const [kurikulumToDelete, setKurikulumToDelete] = useState<Kitab | null>(null);
  const [formData, setFormData] = useState(emptyKurikulum);
  const [selectedKelas, setSelectedKelas] = useState('all');
  const [importFile, setImportFile] = useState<File | null>(null);
  
  const importInputRef = useRef<HTMLInputElement>(null);

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
    setIsFormDialogOpen(true);
  };

  const handleSaveKurikulum = async () => {
    if (kurikulumRef && firestore) {
      if (kurikulumToEdit) {
        const kurikulumDocRef = doc(firestore, 'kurikulum', kurikulumToEdit.id);
        await updateDocumentNonBlocking(kurikulumDocRef, formData);
      } else {
        await addDocumentNonBlocking(kurikulumRef, formData);
      }
      toast({ title: 'Sukses!', description: 'Data kurikulum berhasil disimpan.' });
      setIsFormDialogOpen(false);
      setKurikulumToEdit(null);
    }
  };

  const handleDeleteKurikulum = (item: Kitab) => {
    if (!isAdmin) return;
    setKurikulumToDelete(item);
  };

  const confirmDelete = async () => {
    if (kurikulumToDelete && firestore) {
      const kurikulumDocRef = doc(firestore, 'kurikulum', kurikulumToDelete.id);
      deleteDocumentNonBlocking(kurikulumDocRef);
      setKurikulumToDelete(null);
      toast({ title: 'Sukses!', description: 'Data kurikulum berhasil dihapus.' });
    }
  };

  const filteredKitabPelajaran = useMemo(() => {
    if (!kitabPelajaran) return [];
    let filtered = kitabPelajaran;
    if (selectedKelas !== 'all') {
      filtered = filtered.filter(item => item.kelas === selectedKelas);
    }
    return filtered.sort((a,b) => Number(a.kelas) - Number(b.kelas) || a.mataPelajaran.localeCompare(b.mataPelajaran));
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

  const downloadTemplate = () => {
    const headers = ["kelas", "mataPelajaran", "kitab"];
    const ws = XLSX.utils.json_to_sheet([], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_kurikulum.xlsx");
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
            const newKurikulum = XLSX.utils.sheet_to_json(worksheet) as Omit<Kitab, 'id'>[];
            
            if (newKurikulum.length === 0) {
              toast({ variant: 'destructive', title: 'Gagal', description: 'File Excel kosong atau format tidak sesuai.' });
              return;
            }

            const batch = writeBatch(firestore);
            const kurikulumCollection = collection(firestore, 'kurikulum');

            newKurikulum.forEach(item => {
              if (item.kelas && item.mataPelajaran && item.kitab) {
                 const newDocRef = doc(kurikulumCollection);
                 batch.set(newDocRef, item);
              }
            });

            await batch.commit();
            toast({ title: 'Import Berhasil!', description: `${newKurikulum.length} data kurikulum berhasil ditambahkan.` });
            setIsImportDialogOpen(false);
            setImportFile(null);
        } catch (error) {
            console.error("Error importing curriculum: ", error);
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
             <div className="flex gap-2">
                {isAdmin && (
                  <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" /> Import Data
                  </Button>
                )}
                <Button onClick={handleExportPdf} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
                </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{kurikulumToEdit ? 'Edit Kurikulum' : 'Tambah Data Kurikulum'}</DialogTitle>
                <DialogDescription>
                  {kurikulumToEdit ? 'Perbarui informasi kurikulum.' : 'Isi formulir di bawah ini untuk menambahkan data kurikulum baru.'}
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
                  <Label htmlFor="mataPelajaran">Mata Pelajaran</Label>
                  <Input id="mataPelajaran" name="mataPelajaran" value={formData.mataPelajaran} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kitab">Kitab</Label>
                  <Input id="kitab" name="kitab" value={formData.kitab} onChange={handleInputChange} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsFormDialogOpen(false)}>Batal</Button>
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
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Data Kurikulum dari Excel</DialogTitle>
                <DialogDescription>
                  Pilih file Excel untuk mengimpor data kurikulum. Pastikan format file sesuai dengan template.
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
