
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Siswa, Kurikulum, Nilai } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Search, FileDown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function NilaiPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedKelas, setSelectedKelas] = useState('1');
  const [selectedSemester, setSelectedSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  
  // --- Data Fetching ---
  const siswaQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'), where('kelas', '==', Number(selectedKelas)));
  }, [firestore, user, selectedKelas]);
  const { data: students, isLoading: studentsLoading } = useCollection<Siswa>(siswaQuery);

  const kurikulumQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'kurikulum'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Kurikulum>(kurikulumQuery);

  const nilaiQuery = useMemoFirebase(() => {
    if (!user || !students) return null;
    const studentIds = students.map(s => s.id);
    if(studentIds.length === 0) return null;
    
    return query(
      collection(firestore, 'nilai'),
      where('kelas', '==', Number(selectedKelas)),
      where('semester', '==', selectedSemester),
      where('siswaId', 'in', studentIds.slice(0, 30))
    );
  }, [firestore, user, selectedKelas, selectedSemester, students]);
  const { data: grades, isLoading: gradesLoading } = useCollection<Nilai>(nilaiQuery);
  
  // --- Memoized Data Processing ---
  const sortedStudents = useMemo(() => {
    if (!students) return [];
    let filtered = students.filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery));
    return filtered.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [students, searchQuery]);
  
  const sortedSubjects = useMemo(() => {
    return subjects?.sort((a,b) => a.mataPelajaran.localeCompare(b.mataPelajaran)) || [];
  }, [subjects]);

  const gradesMap = useMemo(() => {
    const map = new Map<string, Nilai>();
    grades?.forEach(grade => {
      const key = `${grade.siswaId}-${grade.kurikulumId}`;
      map.set(key, grade);
    });
    return map;
  }, [grades]);
  
  useEffect(() => {
    if (sortedStudents && sortedStudents.length > 0) {
      if (!selectedStudent || !sortedStudents.find(s => s.id === selectedStudent.id)) {
        setSelectedStudent(sortedStudents[0]);
      }
    } else {
      setSelectedStudent(null);
    }
  }, [sortedStudents, selectedStudent]);

  // --- Event Handlers ---
  const handleSaveGrade = async (siswaId: string, kurikulumId: string, value: string) => {
    if (!isAdmin || !firestore) return;
    if (value.trim() === '') {
        // Handle deletion if value is cleared.
        const grade = gradesMap.get(`${siswaId}-${kurikulumId}`);
        if(grade) {
          const gradeRef = doc(firestore, 'nilai', grade.id);
          const batch = writeBatch(firestore);
          batch.delete(gradeRef);
          try {
            await batch.commit();
            toast({ title: 'Sukses!', description: 'Nilai berhasil dihapus.'});
          } catch(error) {
             toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menghapus nilai.'});
          }
        }
        return true;
    }

    const newNilai = parseInt(value, 10);
    if (isNaN(newNilai) || newNilai < 0 || newNilai > 100) {
      toast({ variant: 'destructive', title: 'Nilai tidak valid', description: 'Masukkan angka antara 0 dan 100.' });
      return false;
    }

    const grade = gradesMap.get(`${siswaId}-${kurikulumId}`);
    const batch = writeBatch(firestore);

    if (grade) {
      if (grade.nilai !== newNilai) {
        const gradeRef = doc(firestore, 'nilai', grade.id);
        batch.update(gradeRef, { nilai: newNilai });
      } else {
        return true; // No change needed
      }
    } else {
      const newGradeRef = doc(collection(firestore, 'nilai'));
      const newGradeData: Omit<Nilai, 'id'> = {
        siswaId,
        kurikulumId,
        kelas: Number(selectedKelas),
        semester: selectedSemester,
        nilai: newNilai,
      };
      batch.set(newGradeRef, newGradeData);
    }

    try {
        await batch.commit();
        toast({ title: 'Sukses!', description: 'Nilai berhasil disimpan.'});
        return true;
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menyimpan nilai.'});
        return false;
    }
  };
  
  const handleExport = (format: 'pdf' | 'csv') => {
    const head = ['Nama', 'NIS', ...sortedSubjects.map(s => s.mataPelajaran)];
    const body = sortedStudents.map(student => {
        return [
            student.nama,
            student.nis,
            ...sortedSubjects.map(subject => {
                const grade = gradesMap.get(`${student.id}-${subject.id}`);
                return grade?.nilai ?? '';
            })
        ];
    });

    const filename = `Nilai_Kelas_${selectedKelas}_Semester_${selectedSemester}`;

    if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'landscape' }) as jsPDFWithAutoTable;
        doc.text(`Data Nilai Kelas ${selectedKelas} - Semester ${selectedSemester}`, 14, 10);
        doc.autoTable({
            head: [head],
            body: body,
        });
        doc.save(`${filename}.pdf`);
    } else {
        const csvContent = Papa.unparse({ fields: head, data: body });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const isLoading = studentsLoading || subjectsLoading || gradesLoading;

  const renderMobileView = () => (
    <div className="flex flex-col md:flex-row h-[calc(100vh-250px)] gap-4">
      <Card className="w-full md:w-1/3 flex flex-col">
        <CardContent className="p-2 flex-grow">
          <ScrollArea className="h-full">
            {isLoading && <p className="p-4 text-center">Memuat siswa...</p>}
            {!isLoading && sortedStudents.length === 0 && <p className="p-4 text-center">Tidak ada siswa.</p>}
            {sortedStudents.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-colors",
                  selectedStudent?.id === student.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <p className="font-semibold">{student.nama}</p>
                <p className="text-xs text-muted-foreground">{student.nis}</p>
              </button>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
      <Card className="w-full md:w-2/3 flex-1 flex flex-col">
        <CardContent className="p-2 flex-grow">
          <ScrollArea className="h-full">
            {isLoading && <p className="p-4 text-center">Memuat mata pelajaran...</p>}
            {!selectedStudent && !isLoading && <p className="p-4 text-center">Pilih siswa untuk melihat nilai.</p>}
            {selectedStudent && (
              <div className="p-2 space-y-3">
                 <h3 className="font-bold text-lg text-center mb-4">{selectedStudent.nama}</h3>
                 {sortedSubjects.length === 0 && <p className="text-center text-muted-foreground">Tidak ada mata pelajaran untuk kelas ini.</p>}
                {sortedSubjects.map(subject => {
                  const grade = gradesMap.get(`${selectedStudent.id}-${subject.id}`);
                  return (
                    <div key={subject.id} className="flex items-center justify-between gap-4">
                      <label className="flex-1 truncate" htmlFor={`${selectedStudent.id}-${subject.id}`}>
                        {subject.mataPelajaran}
                      </label>
                      <Input
                        id={`${selectedStudent.id}-${subject.id}`}
                        type="number"
                        defaultValue={grade?.nilai}
                        onBlur={(e) => handleSaveGrade(selectedStudent.id, subject.id, e.target.value)}
                        disabled={!isAdmin}
                        className="w-24 text-center"
                        placeholder="-"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderDesktopView = () => (
    <div className="border rounded-lg overflow-hidden bg-card">
      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="font-headline sticky left-0 bg-card z-10 w-[200px] shadow-sm">Nama Siswa</TableHead>
              <TableHead className="font-headline w-[120px]">NIS</TableHead>
              {sortedSubjects.map(subject => (
                <TableHead key={subject.id} className="font-headline text-center min-w-[150px]">{subject.mataPelajaran}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={sortedSubjects.length + 2} className="text-center">Memuat data...</TableCell></TableRow>}
            {!isLoading && sortedStudents.length === 0 && <TableRow><TableCell colSpan={sortedSubjects.length + 2} className="text-center">Tidak ada siswa di kelas ini.</TableCell></TableRow>}
            {sortedStudents.map(student => (
              <TableRow key={student.id}>
                <TableCell className="font-medium sticky left-0 bg-card z-10">{student.nama}</TableCell>
                <TableCell>{student.nis}</TableCell>
                {sortedSubjects.map(subject => {
                  const grade = gradesMap.get(`${student.id}-${subject.id}`);
                  return (
                    <TableCell key={subject.id} className="text-center">
                      <Input
                        type="number"
                        defaultValue={grade?.nilai}
                        onBlur={(e) => handleSaveGrade(student.id, subject.id, e.target.value)}
                        disabled={!isAdmin}
                        className="min-w-[70px] text-center mx-auto"
                        placeholder="-"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="h-1" />
      </ScrollArea>
    </div>
  );


  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Input Nilai Siswa</h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola nilai siswa per mata pelajaran secara interaktif.
            </p>
          </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
                </Button>
                <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor CSV
                </Button>
            </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari Nama atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-4">
            <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setSearchQuery('');}}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih Kelas" />
              </SelectTrigger>
              <SelectContent>
                {KELAS_OPTIONS.map(kelas => (
                  <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSemester} onValueChange={(v) => setSelectedSemester(v as any)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ganjil">Semester Ganjil</SelectItem>
                <SelectItem value="genap">Semester Genap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex-grow">
          {isMobile ? renderMobileView() : renderDesktopView()}
        </div>
      </div>
    </div>
  );
}

    