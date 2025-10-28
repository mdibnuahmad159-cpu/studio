
'use client';

import { useState, useMemo, useRef } from 'react';
import { Guru } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, FileDown, Upload, MoreHorizontal, Pencil, Trash2, Camera, User } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
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
import { useCollection, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyTeacher: Omit<Guru, 'id' | 'imageId'> = {
  name: '',
  position: '',
  whatsapp: '',
};

const positionOrder = [
  'Pengasuh',
  'Pengawas',
  'Kepala Madrasah',
  'Wakil Kepala Madrasah',
  'Sekretaris',
  'Bendahara',
  'Guru'
];

export default function GuruPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const teachersRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'gurus');
  }, [firestore, user]);
  const { data: teachers, isLoading } = useCollection<Guru>(teachersRef);
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Guru | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Guru | null>(null);
  const [formData, setFormData] = useState(emptyTeacher);
  const [importFile, setImportFile] = useState<File | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);


  const sortedTeachers = useMemo(() => {
    if (!teachers) return [];
    return [...teachers].sort((a, b) => {
      const indexA = positionOrder.indexOf(a.position);
      const indexB = positionOrder.indexOf(b.position);
      
      const effectiveIndexA = indexA === -1 ? positionOrder.length : indexA;
      const effectiveIndexB = indexB === -1 ? positionOrder.length : indexB;

      return effectiveIndexA - effectiveIndexB;
    });
  }, [teachers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenFormDialog = (teacher: Guru | null = null) => {
    if (!isAdmin) return;
    setTeacherToEdit(teacher);
    setFormData(teacher ? { name: teacher.name, position: teacher.position, whatsapp: teacher.whatsapp } : emptyTeacher);
    setIsFormDialogOpen(true);
  };

  const handleSaveTeacher = async () => {
    if (!firestore || !teachersRef) return;
    if (formData.name && formData.position && formData.whatsapp) {
      if (teacherToEdit) {
        const teacherDocRef = doc(firestore, 'gurus', teacherToEdit.id);
        updateDocumentNonBlocking(teacherDocRef, { ...formData });
      } else {
        addDocumentNonBlocking(teachersRef, { ...formData, imageId: null });
      }
      setIsFormDialogOpen(false);
      setTeacherToEdit(null);
      setFormData(emptyTeacher);
      toast({ title: 'Sukses!', description: 'Data guru berhasil disimpan.' });
    }
  };
  
  const handleAvatarClick = (teacherId: string) => {
    if (!isAdmin) return;
    setUploadTarget(teacherId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file && uploadTarget && firestore) {
        onImageChange(uploadTarget, file);
        if(fileInputRef.current) fileInputRef.current.value = '';
        setUploadTarget(null);
     }
  }

  const onImageChange = async (teacherId: string, imageFile: File | null) => {
    if (!firestore || !imageFile) return;

    toast({
        title: 'Mengunggah foto...',
        description: 'Harap tunggu sebentar.'
    });

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = () => {
      const imageUrl = reader.result as string;
      const teacherDocRef = doc(firestore, 'gurus', teacherId);
      updateDocumentNonBlocking(teacherDocRef, { imageId: imageUrl });
      toast({ title: 'Sukses!', description: 'Foto profil berhasil diperbarui.'});
    };
    reader.onerror = (error) => {
      console.error(error);
      toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat membaca file gambar.'});
    }
  };

  const handleDeleteTeacher = (teacher: Guru) => {
    if (!isAdmin) return;
    setTeacherToDelete(teacher);
  };

  const confirmDelete = async () => {
    if (teacherToDelete && firestore) {
      const teacherDocRef = doc(firestore, 'gurus', teacherToDelete.id);
      deleteDocumentNonBlocking(teacherDocRef);
      setTeacherToDelete(null);
      toast({ title: 'Sukses!', description: 'Data guru berhasil dihapus.' });
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Tenaga Pendidik', 20, 10);
    doc.autoTable({
      head: [['Nama', 'Jabatan', 'No. WhatsApp']],
      body: sortedTeachers?.map((teacher: Guru) => [teacher.name, teacher.position, teacher.whatsapp]),
    });
    doc.save('data-guru.pdf');
  };

  const downloadTemplate = () => {
    const headers = ["name", "position", "whatsapp"];
    const csvContent = Papa.unparse({
      fields: headers,
      data: []
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_guru.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImportFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!importFile || !firestore || !teachersRef) return;
    
    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newTeachers = results.data as Omit<Guru, 'id' | 'imageId'>[];
        if (newTeachers.length === 0) {
          toast({ variant: 'destructive', title: 'Gagal', description: 'File CSV kosong atau format tidak sesuai.' });
          return;
        }

        try {
          const batch = writeBatch(firestore);
          newTeachers.forEach(teacher => {
            if (teacher.name && teacher.position && teacher.whatsapp) {
               const newTeacherRef = doc(teachersRef);
               batch.set(newTeacherRef, { ...teacher, imageId: null });
            }
          });
          await batch.commit();
          toast({ title: 'Import Berhasil!', description: `${newTeachers.length} data guru berhasil ditambahkan.` });
          setIsImportDialogOpen(false);
          setImportFile(null);
        } catch (error) {
          console.error("Error importing teachers: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Terjadi kesalahan saat mengimpor data.' });
        }
      },
      error: (error) => {
        console.error("Error parsing CSV: ", error);
        toast({ variant: 'destructive', title: 'Error Parsing', description: 'Gagal memproses file CSV.' });
      }
    });
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Tenaga Pendidik Kami</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Bertemu dengan tim profesional yang berdedikasi untuk kesuksesan akademis dan personal siswa.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button onClick={() => handleOpenFormDialog()} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Guru
              </Button>
            )}
             <div className="flex gap-2">
                {isAdmin && (
                  <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" /> Import CSV
                  </Button>
                )}
                <Button onClick={handleExportPdf} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
                </Button>
            </div>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="relative w-full overflow-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline w-[80px]">Foto</TableHead>
                  <TableHead className="font-headline w-[30%]">Nama</TableHead>
                  <TableHead className="font-headline w-[30%]">Jabatan</TableHead>
                  <TableHead className="font-headline">No. WhatsApp</TableHead>
                  {isAdmin && <TableHead className="font-headline text-right w-[100px]">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={isAdmin ? 5 : 4}>Loading...</TableCell></TableRow>}
                {sortedTeachers?.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="relative w-12 h-12 group">
                        <Avatar className="w-full h-full text-lg">
                          {teacher.imageId ? (
                            <AvatarImage src={teacher.imageId} alt={teacher.name} className="object-cover"/>
                          ) : null }
                          <AvatarFallback>
                            <User />
                          </AvatarFallback>
                        </Avatar>
                        {isAdmin && (
                            <button 
                              onClick={() => handleAvatarClick(teacher.id)}
                              className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Ubah foto"
                            >
                              <Camera className="h-5 w-5" />
                            </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>{teacher.position}</TableCell>
                    <TableCell>
                      <Link href={`https://wa.me/${teacher.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {teacher.whatsapp}
                      </Link>
                    </TableCell>
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
                            <DropdownMenuItem onClick={() => handleOpenFormDialog(teacher)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteTeacher(teacher)} className="text-red-600">
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
      </div>

      {isAdmin && (
        <>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{teacherToEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}</DialogTitle>
                <DialogDescription>
                  {teacherToEdit ? 'Perbarui informasi guru di bawah ini.' : 'Isi formulir di bawah ini untuk menambahkan data guru baru.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Jabatan</Label>
                  <Input id="position" name="position" value={formData.position} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">No. WhatsApp</Label>
                  <Input id="whatsapp" name="whatsapp" type="tel" value={formData.whatsapp} onChange={handleInputChange} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsFormDialogOpen(false)}>Batal</Button>
                <Button type="submit" onClick={handleSaveTeacher}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <AlertDialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
                <AlertDialogDescription>
                  Data guru "{teacherToDelete?.name}" akan dihapus secara permanen. Aksi ini tidak dapat dibatalkan.
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
                <DialogTitle>Import Data Guru dari CSV</DialogTitle>
                <DialogDescription>
                  Pilih file CSV untuk mengimpor data guru secara massal. Pastikan format file sesuai dengan template.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Input 
                    id="import-file"
                    type="file" 
                    accept=".csv"
                    onChange={handleImportFileChange}
                    ref={importInputRef} 
                  />
                </div>
                 <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Unduh Template CSV
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
