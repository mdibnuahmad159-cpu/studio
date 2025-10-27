
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
import { Button } from '@/components/ui/button';
import { Siswa as DetailedStudent } from '@/lib/data';
import { Download, PlusCircle, FileDown, MoreHorizontal, Pencil, Trash2, BookCopy, Search } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const emptyStudent: Omit<DetailedStudent, 'id' | 'fileDokumen' | 'kelas' | 'status'> & { fileDokumen: File | null | string } = {
  nis: '',
  nama: '',
  jenisKelamin: 'Laki-laki',
  tempatLahir: '',
  tanggalLahir: '',
  namaAyah: '',
  namaIbu: '',
  alamat: '',
  fileDokumen: null,
};

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];


export default function SiswaPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const siswaAktifQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'));
  }, [firestore, user]);
  const { data: activeStudents, isLoading } = useCollection<DetailedStudent>(siswaAktifQuery);
  const { isAdmin } = useAdmin();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignClassDialogOpen, setIsAssignClassDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<DetailedStudent | null>(null);
  const [studentToAssign, setStudentToAssign] = useState<DetailedStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<DetailedStudent | null>(null);
  const [formData, setFormData] = useState({ ...emptyStudent });
  const [file, setFile] = useState<File | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  
  const filteredStudents = useMemo(() => {
    if (!activeStudents) return [];
    if (!searchQuery) return activeStudents;
    
    return activeStudents.filter(student => 
        student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
        student.nis.includes(searchQuery)
    );
  }, [activeStudents, searchQuery]);

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
    if (!isAdmin) return;
    setStudentToEdit(student);
    if (student) {
      setFormData({
        nis: student.nis,
        nama: student.nama,
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
      setFormData({ ...emptyStudent });
      setFile(null);
    }
    setIsDialogOpen(true);
  };
  
  const handleSaveStudent = () => {
    if (!firestore) return;
    // In a real app, file upload would be handled via Firebase Storage
    // For this prototype, we are skipping the actual upload and just using a placeholder
    const fileUrl = file ? URL.createObjectURL(file) : (typeof formData.fileDokumen === 'string' ? formData.fileDokumen : '/path/to/default.pdf');
    
    const studentData: Omit<DetailedStudent, 'id'> = {
      nis: formData.nis,
      nama: formData.nama,
      jenisKelamin: formData.jenisKelamin,
      tempatLahir: formData.tempatLahir,
      tanggalLahir: formData.tanggalLahir,
      namaAyah: formData.namaAyah,
      namaIbu: formData.namaIbu,
      alamat: formData.alamat,
      fileDokumen: fileUrl,
      kelas: studentToEdit ? studentToEdit.kelas : 0,
      status: 'Aktif',
    };

    if (studentToEdit) {
      // Edit
      const studentDocRef = doc(firestore, 'siswa', studentToEdit.id);
      updateDocumentNonBlocking(studentDocRef, studentData);
    } else {
      // Add a new student. We use NIS as the document ID.
      const studentDocRef = doc(firestore, 'siswa', formData.nis);
      setDocumentNonBlocking(studentDocRef, studentData, { merge: false });

      // Also create a corresponding raport document
      const raportDocRef = doc(firestore, 'raports', formData.nis);
      const newRaport = {
        nis: formData.nis,
        raports: {
          kelas_0_ganjil: null, kelas_0_genap: null,
          kelas_1_ganjil: null, kelas_1_genap: null,
          kelas_2_ganjil: null, kelas_2_genap: null,
          kelas_3_ganjil: null, kelas_3_genap: null,
          kelas_4_ganjil: null, kelas_4_genap: null,
          kelas_5_ganjil: null, kelas_5_genap: null,
          kelas_6_ganjil: null, kelas_6_genap: null,
        }
      };
      setDocumentNonBlocking(raportDocRef, newRaport, { merge: false });
    }

    setIsDialogOpen(false);
    setStudentToEdit(null);
  };


  const handleDeleteStudent = (student: DetailedStudent) => {
    if (!isAdmin) return;
    setStudentToDelete(student);
  };

  const confirmDelete = () => {
    if(studentToDelete && firestore) {
        const studentDocRef = doc(firestore, 'siswa', studentToDelete.id);
        deleteDocumentNonBlocking(studentDocRef);

        // Also delete the corresponding raport document
        const raportDocRef = doc(firestore, 'raports', studentToDelete.nis);
        deleteDocumentNonBlocking(raportDocRef);

        setStudentToDelete(null);
    }
  };

  const handleOpenAssignClassDialog = (student: DetailedStudent) => {
    if (!isAdmin) return;
    setStudentToAssign(student);
    setSelectedClass(String(student.kelas));
    setIsAssignClassDialogOpen(true);
  };

  const handleAssignClass = () => {
    if (studentToAssign && firestore) {
      const studentDocRef = doc(firestore, 'siswa', studentToAssign.id);
      updateDocumentNonBlocking(studentDocRef, { kelas: Number(selectedClass) });
      
      toast({
        title: 'Berhasil!',
        description: `${studentToAssign.nama} telah dimasukkan ke kelas ${selectedClass}.`
      });
      setIsAssignClassDialogOpen(false);
      setStudentToAssign(null);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Siswa', 20, 10);
    doc.autoTable({
      head: [['Nama', 'NIS', 'Kelas', 'Jenis Kelamin', 'TTL', 'Nama Ayah', 'Nama Ibu', 'Alamat']],
      body: (filteredStudents || []).map((student: DetailedStudent) => [
        student.nama,
        student.nis,
        student.kelas,
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Data Siswa
            </h1>
            <p className="mt-4 max-w-4xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Informasi detail mengenai siswa yang terdaftar di IBNU AHMAD APP.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isAdmin && (
              <Button onClick={() => handleOpenDialog()} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Siswa
              </Button>
            )}
            <Button onClick={handleExportPdf} variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
            <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Cari Nama atau NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Nama</TableHead>
                <TableHead className="font-headline">NIS</TableHead>
                <TableHead className="font-headline">Kelas</TableHead>
                <TableHead className="font-headline">Jenis Kelamin</TableHead>
                <TableHead className="font-headline">TTL</TableHead>
                <TableHead className="font-headline">Nama Ayah</TableHead>
                <TableHead className="font-headline">Nama Ibu</TableHead>
                <TableHead className="font-headline">Alamat</TableHead>
                <TableHead className="font-headline">Dokumen</TableHead>
                {isAdmin && <TableHead className="font-headline text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={isAdmin ? 10 : 9}>Loading...</TableCell></TableRow>}
              {filteredStudents?.map((student) => (
                <TableRow key={student.nis}>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.kelas}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleOpenAssignClassDialog(student)}>
                            <BookCopy className="mr-2 h-4 w-4" />
                            <span>Masukkan ke Kelas</span>
                          </DropdownMenuItem>
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
                <Button type="submit" onClick={handleSaveStudent}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAssignClassDialogOpen} onOpenChange={setIsAssignClassDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Masukkan Siswa ke Kelas</DialogTitle>
                <DialogDescription>
                  Pilih kelas baru untuk siswa <strong>{studentToAssign?.nama}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="kelas">Pilih Kelas</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Pilih Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                          {KELAS_OPTIONS.map(kelas => (
                              <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setIsAssignClassDialogOpen(false)}>Batal</Button>
                <Button type="submit" onClick={handleAssignClass}>Simpan</Button>
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
        </>
      )}
    </div>
  );
}
