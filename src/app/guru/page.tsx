
'use client';

import { useState } from 'react';
import { teachers as initialTeachers, type Teacher } from '@/lib/data';
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

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function GuruPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', position: '', whatsapp: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewTeacher(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTeacher = () => {
    if (newTeacher.name && newTeacher.position && newTeacher.whatsapp) {
      const newTeacherData: Teacher = {
        id: teachers.length > 0 ? Math.max(...teachers.map(t => t.id)) + 1 : 1,
        ...newTeacher,
        imageId: null,
      };
      setTeachers(prev => [...prev, newTeacherData]);
      setNewTeacher({ name: '', position: '', whatsapp: '' });
      setIsDialogOpen(false);
    }
  };
  
  const handleImageChange = (teacherId: number, image: string | null) => {
    setTeachers(prev =>
      prev.map(teacher =>
        teacher.id === teacherId ? { ...teacher, imageId: image } : teacher
      )
    );
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Tenaga Pendidik', 20, 10);
    doc.autoTable({
      head: [['Nama', 'Jabatan', 'No. WhatsApp']],
      body: teachers.map((teacher: Teacher) => [teacher.name, teacher.position, teacher.whatsapp]),
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
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Guru
            </Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} onImageChange={handleImageChange} />
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Data Guru</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah ini untuk menambahkan data guru baru.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nama
              </Label>
              <Input id="name" name="name" value={newTeacher.name} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Jabatan
              </Label>
              <Input id="position" name="position" value={newTeacher.position} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="whatsapp" className="text-right">
                No. WhatsApp
              </Label>
              <Input id="whatsapp" name="whatsapp" type="tel" value={newTeacher.whatsapp} onChange={handleInputChange} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button type="submit" onClick={handleAddTeacher}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
