
'use client';

import { useState, useMemo, useRef } from 'react';
import { Guru } from '@/lib/data';
import { TeacherCard } from '@/components/teacher-card';
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
import { PlusCircle, FileDown, Upload } from 'lucide-react';
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
  
  const handleImageChange = async (teacherId: string, imageFile: File | null) => {
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
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading && <p>Loading...</p>}
          {sortedTeachers?.map((teacher) => (
            <TeacherCard 
              key={teacher.id} 
              teacher={teacher} 
              onImageChange={handleImageChange} 
              onEdit={handleOpenFormDialog}
              onDelete={handleDeleteTeacher}
              isAdmin={isAdmin}
            />
          ))}
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
