
'use client';

import { useState } from 'react';
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
import { PlusCircle, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyTeacher: Omit<Guru, 'id' | 'imageId'> = {
  name: '',
  position: '',
  whatsapp: '',
};

export default function GuruPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const teachersRef = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'gurus');
  }, [firestore, user]);
  const { data: teachers, isLoading } = useCollection<Guru>(teachersRef);
  const { isAdmin } = useAdmin();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Guru | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Guru | null>(null);
  const [formData, setFormData] = useState(emptyTeacher);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = (teacher: Guru | null = null) => {
    if (!isAdmin) return;
    setTeacherToEdit(teacher);
    setFormData(teacher ? { name: teacher.name, position: teacher.position, whatsapp: teacher.whatsapp } : emptyTeacher);
    setIsDialogOpen(true);
  };

  const handleSaveTeacher = () => {
    if (formData.name && formData.position && formData.whatsapp && teachersRef) {
      if (teacherToEdit) {
        // Edit
        const teacherDocRef = doc(firestore, 'gurus', teacherToEdit.id);
        updateDocumentNonBlocking(teacherDocRef, { ...formData });
      } else {
        // Add
        addDocumentNonBlocking(teachersRef, { ...formData, imageId: null });
      }
      setIsDialogOpen(false);
      setTeacherToEdit(null);
      setFormData(emptyTeacher);
    }
  };
  
  const handleImageChange = (teacherId: string, image: string | null) => {
    const teacherDocRef = doc(firestore, 'gurus', teacherId);
    updateDocumentNonBlocking(teacherDocRef, { imageId: image });
  };

  const handleDeleteTeacher = (teacher: Guru) => {
    if (!isAdmin) return;
    setTeacherToDelete(teacher);
  };

  const confirmDelete = () => {
    if (teacherToDelete) {
      const teacherDocRef = doc(firestore, 'gurus', teacherToDelete.id);
      deleteDocumentNonBlocking(teacherDocRef);
      setTeacherToDelete(null);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Tenaga Pendidik', 20, 10);
    doc.autoTable({
      head: [['Nama', 'Jabatan', 'No. WhatsApp']],
      body: teachers?.map((teacher: Guru) => [teacher.name, teacher.position, teacher.whatsapp]),
    });
    doc.save('data-guru.pdf');
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
              <Button onClick={() => handleOpenDialog()} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Guru
              </Button>
            )}
            <Button onClick={handleExportPdf} variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading && <p>Loading...</p>}
          {teachers?.map((teacher) => (
            <TeacherCard 
              key={teacher.id} 
              teacher={teacher} 
              onImageChange={handleImageChange} 
              onEdit={handleOpenDialog}
              onDelete={handleDeleteTeacher}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>

      {isAdmin && (
        <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{teacherToEdit ? 'Edit Data Guru' : 'Tambah Data Guru'}</DialogTitle>
                <DialogDescription>
                  {teacherToEdit ? 'Perbarui informasi guru di bawah ini.' : 'Isi formulir di bawah ini untuk menambahkan data guru baru.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nama
                  </Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="position" className="text-right">
                    Jabatan
                  </Label>
                  <Input id="position" name="position" value={formData.position} onChange={handleInputChange} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="whatsapp" className="text-right">
                    No. WhatsApp
                  </Label>
                  <Input id="whatsapp" name="whatsapp" type="tel" value={formData.whatsapp} onChange={handleInputChange} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
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
        </>
      )}
    </div>
  );
}
