
'use client';

import { useState, useEffect } from 'react';
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
import { Download, PlusCircle, FileDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyStudent: Omit<DetailedStudent, 'fileDokumen' | 'nis' | 'kelas' | 'status'> & { fileDokumen: File | null | string } = {
  nama: '',
  jenisKelamin: 'Laki-laki',
  tempatLahir: '',
  tanggalLahir: '',
  namaAyah: '',
  namaIbu: '',
  alamat: '',
  fileDokumen: null,
};

// This is a mock in-memory store to sync data across pages.
// In a real app, you would use a proper database or state management solution.
let dataStore = {
    students: initialStudents,
};


export default function SiswaPage() {
  const [students, setStudents] = useState<DetailedStudent[]>(dataStore.students);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<DetailedStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<DetailedStudent | null>(null);
  const [formData, setFormData] = useState({ ...emptyStudent, nis: '' });
  const [file, setFile] = useState<File | null>(null);

  // Effect to sync state with the mock data store on component mount and updates
  useEffect(() => {
    setStudents(dataStore.students);
  }, []); 

  const updateStudents = (newStudents: DetailedStudent[]) => {
      dataStore.students = newStudents;
      setStudents(newStudents);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleRadioChange = (value: 'Laki-laki' | 'Perempuan') => {
    setFormData(prev => ({ ...prev, jenisKelamin: value }));
  };

  const handleOpenDialog = (student: DetailedStudent | null = null) => {
    setStudentToEdit(student);
    if (student) {
      setFormData({
        nama: student.nama,
        nis: student.nis,
        jenisKelamin: student.jenisKelamin,
        tempatLahir: student.tempatLahir,
        tanggalLahir: student.tanggalLahir,
        namaAyah: student.namaAyah,
        namaIbu: student.namaIbu,
        alamat: student.alamat,
        fileDokumen: student.fileDokumen,
      });
      setFile(null);
    } else {
      setFormData({ ...emptyStudent, nis: '' });
      setFile(null);
    }
    setIsDialogOpen(true);
  };
  
  const handleSaveStudent = () => {
    if (studentToEdit) {
      // Edit
      let fileUrl = studentToEdit.fileDokumen;
      if (file) {
        fileUrl = URL.createObjectURL(file);
      }
      const updatedStudent: DetailedStudent = {
        ...studentToEdit,
        ...formData,
        fileDokumen: fileUrl,
      };
      const newStudents = students.map(s => s.nis === studentToEdit.nis ? updatedStudent : s);
      updateStudents(newStudents);
    } else {
      // Add
      let fileUrl = '/path/to/default.pdf';
      if (file) {
        fileUrl = URL.createObjectURL(file);
      }
      const studentToAdd: DetailedStudent = {
          nama: formData.nama,
          nis: formData.nis || `N-${Date.now()}`,
          jenisKelamin: formData.jenisKelamin,
          tempatLahir: formData.tempatLahir,
          tanggalLahir: formData.tanggalLahir,
          namaAyah: formData.namaAyah,
          namaIbu: formData.namaIbu,
          alamat: formData.alamat,
          fileDokumen: fileUrl,
          kelas: 0, // Default kelas
          status: 'Aktif'
      };
      const newStudents = [...students, studentToAdd];
      updateStudents(newStudents);
    }
    setIsDialogOpen(false);
    setStudentToEdit(null);
  };

  const handleDeleteStudent = (student: DetailedStudent) => {
    setStudentToDelete(student);
  };

  const confirmDelete = () => {
    if(studentToDelete) {
        const newStudents = students.filter(s => s.nis !== studentToDelete.nis);
        updateStudents(newStudents);
        setStudentToDelete(null);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Siswa', 20, 10);
    const activeStudents = students.filter(s => s.status === 'Aktif');
    doc.autoTable({
      head: [['Nama', 'NIS', 'Jenis Kelamin', 'TTL', 'Nama Ayah', 'Nama Ibu', 'Alamat']],
      body: activeStudents.map((student: DetailedStudent) => [
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

  const activeStudents = students.filter(s => s.status === 'Aktif');

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Data Siswa
            </h1>
            <p className="mt-4 max-w-4xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Informasi detail mengenai siswa yang terdaftar di IBNU AHMAD APP.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:brightness-110">
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
                <TableHead className="font-headline">Dokumen</TableHead>
                <TableHead className="font-headline text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStudents.map((student) => (
                <TableRow key={student.nis}>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>{`${student.tempatLahir}, ${student.tanggalLahir}`}</TableCell>
                  <TableCell>{student.namaAyah}</TableCell>
                  <TableCell>{student.namaIbu}</TableCell>
                  <TableCell>{student.alamat}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <a href={student.fileDokumen} download>
                        <Download className="mr-2 h-4 w-4" />
                        Unduh
                      </a>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(student)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteStudent(student)}
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
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{studentToEdit ? 'Edit Data Siswa' : 'Tambah Data Siswa'}</DialogTitle>
            <DialogDescription>
              {studentToEdit ? 'Perbarui informasi siswa di bawah ini.' : 'Isi formulir di bawah ini untuk menambahkan data siswa baru.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input id="nama" name="nama" value={formData.nama} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="nis">NIS</Label>
                <Input id="nis" name="nis" value={formData.nis} onChange={handleInputChange} disabled={!!studentToEdit} />
            </div>
             <div className="space-y-2">
                <Label>Jenis Kelamin</Label>
                <RadioGroup name="jenisKelamin" onValueChange={(value: any) => handleRadioChange(value)} value={formData.jenisKelamin} className="flex items-center space-x-4 pt-2">
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
                <Input id="tempatLahir" name="tempatLahir" value={formData.tempatLahir} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="tanggalLahir">Tanggal Lahir (DD-MM-YYYY)</Label>
                <Input id="tanggalLahir" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="namaAyah">Nama Ayah</Label>
                <Input id="namaAyah" name="namaAyah" value={formData.namaAyah} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="namaIbu">Nama Ibu</Label>
                <Input id="namaIbu" name="namaIbu" value={formData.namaIbu} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input id="alamat" name="alamat" value={formData.alamat} onChange={handleInputChange} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="fileDokumen">File Dokumen</Label>
                <Input id="fileDokumen" name="fileDokumen" type="file" onChange={handleFileChange} />
                 {studentToEdit && typeof formData.fileDokumen === 'string' && (
                    <p className="text-sm text-muted-foreground mt-1">Dokumen saat ini: <a href={formData.fileDokumen} target="_blank" rel="noopener noreferrer" className="text-primary underline">Lihat</a></p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button type="submit" onClick={handleSaveStudent} className="bg-gradient-primary text-primary-foreground hover:brightness-110">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin menghapus?</AlertDialogTitle>
            <AlertDialogDescription>
              Data siswa "{studentToDelete?.nama}" akan dihapus secara permanen. Aksi ini tidak dapat dibatalkan.
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


    