
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { detailedStudents as initialStudents, type DetailedStudent } from '@/lib/data';
import { Download, PlusCircle, FileDown } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const emptyStudent: Omit<DetailedStudent, 'fileDokumen'> & { fileDokumen: string } = {
  nama: '',
  nis: '',
  jenisKelamin: 'Laki-laki',
  tempatLahir: '',
  tanggalLahir: '',
  namaAyah: '',
  namaIbu: '',
  alamat: '',
  fileDokumen: '',
};

export default function SiswaPage() {
  const [students, setStudents] = useState<DetailedStudent[]>(initialStudents);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState(emptyStudent);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (value: 'Laki-laki' | 'Perempuan') => {
    setNewStudent(prev => ({ ...prev, jenisKelamin: value }));
  };
  
  const handleAddStudent = () => {
    const studentToAdd = {
        ...newStudent,
        nis: newStudent.nis || `N-${Date.now()}`,
        fileDokumen: newStudent.fileDokumen || '/path/to/default.pdf',
    };
    setStudents(prev => [...prev, studentToAdd]);
    setNewStudent(emptyStudent);
    setIsDialogOpen(false);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.text('Data Siswa', 20, 10);
    doc.autoTable({
      head: [['Nama', 'NIS', 'Jenis Kelamin', 'TTL', 'Nama Ayah', 'Nama Ibu', 'Alamat']],
      body: students.map((student: DetailedStudent) => [
        student.nama,
        student.nis,
        student.jenisKelamin,
        `${student.tempatLahir}, ${student.tanggalLahir}`,
        student.namaAyah,
        student.namaIbu,
        student.alamat,
      ]),
    });
    doc.save('data-siswa.pdf');
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Data Siswa
            </h1>
            <p className="mt-4 max-w-4xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Informasi detail mengenai siswa yang terdaftar di VibrantEdu.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa
            </Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Nama</TableHead>
                <TableHead className="font-headline">NIS</TableHead>
                <TableHead className="font-headline">Jenis Kelamin</TableHead>
                <TableHead className="font-headline">TTL</TableHead>
                <TableHead className="font-headline">Nama Ayah</TableHead>
                <TableHead className="font-headline">Nama Ibu</TableHead>
                <TableHead className="font-headline">Alamat</TableHead>
                <TableHead className="font-headline text-right">Dokumen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.nis}>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>{`${student.tempatLahir}, ${student.tanggalLahir}`}</TableCell>
                  <TableCell>{student.namaAyah}</TableCell>
                  <TableCell>{student.namaIbu}</TableCell>
                  <TableCell>{student.alamat}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <a href={student.fileDokumen} download>
                        <Download className="mr-2 h-4 w-4" />
                        Unduh
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tambah Data Siswa</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah ini untuk menambahkan data siswa baru.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input id="nama" name="nama" value={newStudent.nama} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="nis">NIS</Label>
                <Input id="nis" name="nis" value={newStudent.nis} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <RadioGroup name="jenisKelamin" onValueChange={(value: any) => handleRadioChange(value)} value={newStudent.jenisKelamin} className="flex items-center space-x-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Laki-laki" id="male" />
                        <Label htmlFor="male">Laki-laki</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Perempuan" id="female" />
                        <Label htmlFor="female">Perempuan</Label>
                    </div>
                </RadioGroup>
            </div>
             <div className="space-y-2">
                <Label htmlFor="tempatLahir">Tempat Lahir</Label>
                <Input id="tempatLahir" name="tempatLahir" value={newStudent.tempatLahir} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="tanggalLahir">Tanggal Lahir (DD-MM-YYYY)</Label>
                <Input id="tanggalLahir" name="tanggalLahir" value={newStudent.tanggalLahir} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="namaAyah">Nama Ayah</Label>
                <Input id="namaAyah" name="namaAyah" value={newStudent.namaAyah} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="namaIbu">Nama Ibu</Label>
                <Input id="namaIbu" name="namaIbu" value={newStudent.namaIbu} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input id="alamat" name="alamat" value={newStudent.alamat} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="fileDokumen">URL Dokumen</Label>
                <Input id="fileDokumen" name="fileDokumen" value={newStudent.fileDokumen} onChange={handleInputChange} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button type="submit" onClick={handleAddStudent}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
