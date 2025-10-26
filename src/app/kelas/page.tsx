
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  detailedStudents as initialStudents,
  alumni as initialAlumni,
  type DetailedStudent,
} from '@/lib/data';
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
import { ArrowDown, ArrowUp, GraduationCap, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function KelasPage() {
  const [students, setStudents] = useState<DetailedStudent[]>(initialStudents.filter(s => s.status === 'Aktif'));
  const [alumni, setAlumni] = useState<DetailedStudent[]>(initialAlumni);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [filterKelas, setFilterKelas] = useState('all');
  const [alertInfo, setAlertInfo] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const { toast } = useToast();

  const filteredStudents = useMemo(() => {
    let studentList = [...students];
    if (filterKelas !== 'all') {
      studentList = studentList.filter(s => String(s.kelas) === filterKelas);
    }
    return studentList.sort((a,b) => a.kelas - b.kelas || a.nama.localeCompare(b.nama));
  }, [students, filterKelas]);
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.nis));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (nis: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, nis]);
    } else {
      setSelectedStudents(prev => prev.filter(sNis => sNis !== nis));
    }
  };

  useEffect(() => {
    setSelectedStudents([]);
  }, [filterKelas]);

  const getSelectedStudentsDetails = () => {
    return students.filter(s => selectedStudents.includes(s.nis));
  };

  const currentKelasForSelection = useMemo(() => {
    const selectedDetails = getSelectedStudentsDetails();
    if (selectedDetails.length === 0) return null;
    const firstKelas = selectedDetails[0].kelas;
    if (selectedDetails.every(s => s.kelas === firstKelas)) {
      return firstKelas;
    }
    return 'mixed'; // Indicates selection across different classes
  }, [selectedStudents, students]);

  const createAlert = (title: string, description: string, onConfirm: () => void) => {
    setAlertInfo({ title, description, onConfirm });
  };
  
  const handlePromote = () => {
    const currentKelas = currentKelasForSelection;
    if (currentKelas === null || currentKelas === 'mixed' || currentKelas === 6) return;
    const studentNames = getSelectedStudentsDetails().map(s => s.nama).join(', ');
    createAlert(
      'Naik Kelas',
      `Anda yakin ingin menaikkan ${selectedStudents.length} siswa (${studentNames}) ke kelas ${currentKelas + 1}?`,
      () => {
        setStudents(prev => prev.map(s => selectedStudents.includes(s.nis) ? { ...s, kelas: s.kelas + 1 } : s));
        setSelectedStudents([]);
        toast({ title: 'Berhasil!', description: `${selectedStudents.length} siswa telah dinaikkan kelas.` });
      }
    );
  };

  const handleDemote = () => {
    const currentKelas = currentKelasForSelection;
    if (currentKelas === null || currentKelas === 'mixed' || currentKelas === 0) return;
    const studentNames = getSelectedStudentsDetails().map(s => s.nama).join(', ');
    createAlert(
      'Turun Kelas',
      `Anda yakin ingin menurunkan ${selectedStudents.length} siswa (${studentNames}) ke kelas ${currentKelas - 1}?`,
      () => {
        setStudents(prev => prev.map(s => selectedStudents.includes(s.nis) ? { ...s, kelas: s.kelas - 1 } : s));
        setSelectedStudents([]);
        toast({ title: 'Berhasil!', description: `${selectedStudents.length} siswa telah diturunkan kelas.` });
      }
    );
  };
  
  const handleGraduate = () => {
    if (currentKelasForSelection !== 6) return;
    const studentNames = getSelectedStudentsDetails().map(s => s.nama).join(', ');
    createAlert(
      'Luluskan Siswa',
      `Anda yakin ingin meluluskan ${selectedStudents.length} siswa (${studentNames})? Mereka akan dipindahkan ke data alumni.`,
      () => {
        const year = new Date().getFullYear();
        const graduatedStudents = students
          .filter(s => selectedStudents.includes(s.nis))
          .map(s => ({ ...s, status: 'Lulus' as const, tahunLulus: year }));
        
        setAlumni(prev => [...prev, ...graduatedStudents]);
        setStudents(prev => prev.filter(s => !selectedStudents.includes(s.nis)));
        setSelectedStudents([]);
        toast({ title: 'Berhasil!', description: `${graduatedStudents.length} siswa telah diluluskan.` });
      }
    );
  };

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text(`Data Siswa - ${filterKelas === 'all' ? 'Semua Kelas' : `Kelas ${filterKelas}`}`, 20, 10);
    doc.autoTable({
      head: [['Kelas', 'Nama', 'NIS', 'Jenis Kelamin', 'Status']],
      body: filteredStudents.map((student) => [
        `Kelas ${student.kelas}`,
        student.nama,
        student.nis,
        student.jenisKelamin,
        student.status,
      ]),
    });
    doc.save('data-kelas.pdf');
  };

  const areActionsDisabled = selectedStudents.length === 0 || currentKelasForSelection === 'mixed';
  const currentKelas = currentKelasForSelection;


  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Pengelolaan Kelas
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola status siswa, naikkan, turunkan, atau luluskan siswa dengan mudah.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
                <Select value={filterKelas} onValueChange={setFilterKelas}>
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
                 {selectedStudents.length > 0 && (
                    <span className="text-sm text-muted-foreground">{selectedStudents.length} siswa dipilih</span>
                 )}
            </div>
            
            <div className="flex gap-2 flex-wrap justify-end">
                <Button onClick={handlePromote} size="sm" variant="outline" disabled={areActionsDisabled || currentKelas === 6}>
                    <ArrowUp className="mr-2 h-4 w-4" /> Naik Kelas
                </Button>
                <Button onClick={handleDemote} size="sm" variant="outline" disabled={areActionsDisabled || currentKelas === 0}>
                    <ArrowDown className="mr-2 h-4 w-4" /> Turun Kelas
                </Button>
                <Button onClick={handleGraduate} size="sm" variant="destructive" disabled={areActionsDisabled || currentKelas !== 6}>
                    <GraduationCap className="mr-2 h-4 w-4" /> Luluskan
                </Button>
                 <Button onClick={handleExportPdf} size="sm" variant="outline">
                    <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
                </Button>
            </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  />
                </TableHead>
                <TableHead className="font-headline">Kelas</TableHead>
                <TableHead className="font-headline">Nama</TableHead>
                <TableHead className="font-headline">NIS</TableHead>
                <TableHead className="font-headline">Jenis Kelamin</TableHead>
                <TableHead className="font-headline">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.nis} data-state={selectedStudents.includes(student.nis) ? "selected" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(student.nis)}
                      onCheckedChange={(checked) => handleSelectStudent(student.nis, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell>Kelas {student.kelas}</TableCell>
                  <TableCell className="font-medium">{student.nama}</TableCell>
                  <TableCell>{student.nis}</TableCell>
                  <TableCell>{student.jenisKelamin}</TableCell>
                  <TableCell>
                      <Badge variant={student.status === 'Aktif' ? 'secondary' : 'default'} className={student.status === 'Aktif' ? 'bg-green-100 text-green-800' : ''}>
                        {student.status}
                      </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

       <AlertDialog open={!!alertInfo} onOpenChange={() => setAlertInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertInfo?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {alertInfo?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => { alertInfo?.onConfirm(); setAlertInfo(null); }} >
              Konfirmasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    