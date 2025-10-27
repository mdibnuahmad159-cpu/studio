
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
import { Search, Save, FileDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
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

  // Set first student as default on mobile
  useEffect(() => {
    if (isMobile && sortedStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(sortedStudents[0]);
    } else if (isMobile && sortedStudents.length > 0 && selectedStudent) {
        const studentStillExists = sortedStudents.find(s => s.id === selectedStudent.id);
        if(!studentStillExists) {
            setSelectedStudent(sortedStudents[0]);
        }
    } else if (!isMobile) {
      setSelectedStudent(null);
    }
  }, [isMobile, sortedStudents, selectedStudent]);


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

  // --- RENDER LOGIC ---

  const renderTableView = () => (
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
            <div className="h-4" /> 
          </ScrollArea>
    </div>
  );

  const renderMobileView = () => (
    <div className="flex flex-1 gap-2 overflow-hidden">
      <ScrollArea className="w-1/3 border rounded-lg">
        <div className="p-2 space-y-1">
          {isLoading && <p className="p-2 text-xs text-muted-foreground">Loading...</p>}
          {sortedStudents.map(student => (
            <Button
              key={student.id}
              variant={selectedStudent?.id === student.id ? 'secondary' : 'ghost'}
              className="w-full justify-start text-left h-auto py-2 px-3"
              onClick={() => setSelectedStudent(student)}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">{student.nama}</span>
                <span className="text-xs text-muted-foreground">{student.nis}</span>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
      <ScrollArea className="w-2/3 border rounded-lg">
        <div className="p-4">
          {selectedStudent ? (
            <div className="space-y-4">
              <h3 className="font-bold">{selectedStudent.nama}</h3>
              {sortedSubjects.length > 0 ? (
                sortedSubjects.map(subject => {
                  const grade = gradesMap.get(`${selectedStudent.id}-${subject.id}`);
                  return (
                    <div key={subject.id} className="grid grid-cols-3 items-center gap-2">
                      <label className="text-sm col-span-2 truncate">{subject.mataPelajaran}</label>
                      <Input
                        type="number"
                        defaultValue={grade?.nilai}
                        onBlur={(e) => handleSaveGrade(selectedStudent.id, subject.id, e.target.value)}
                        disabled={!isAdmin}
                        className="text-center"
                        placeholder="-"
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">Tidak ada mata pelajaran untuk kelas ini.</p>
              )}
            </div>
          ) : (
             <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center">
                {sortedStudents.length > 0 ? 'Pilih siswa untuk input nilai.' : 'Tidak ada siswa di kelas ini.'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );


  return (
    <div className="bg-background">
      <div className={cn("container py-12 md:py-20 flex flex-col", isMobile ? "h-[calc(100vh-8rem-3rem)] md:h-auto pb-4 md:pb-20" : "")}>
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
            <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setSelectedStudent(null); setSearchQuery('');}}>
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
        
        <div className="flex-grow overflow-hidden">
          {isMobile ? renderMobileView() : renderTableView()}
        </div>

      </div>
    </div>
  );
}


    