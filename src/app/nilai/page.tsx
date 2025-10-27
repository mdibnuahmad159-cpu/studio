
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
  
  // State for mobile view
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [mobileGrades, setMobileGrades] = useState<Record<string, string>>({});

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
    
    // Firestore 'in' query is limited to 30 items. 
    // If you have more students, you'd need to batch the queries.
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

  // --- Effects ---
  useEffect(() => {
    // Select the first student by default on mobile if the list is available
    if (isMobile && sortedStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(sortedStudents[0]);
    }
    // If the selected student is no longer in the filtered list, deselect them
    if (isMobile && selectedStudent && !sortedStudents.find(s => s.id === selectedStudent.id)) {
        setSelectedStudent(sortedStudents.length > 0 ? sortedStudents[0] : null);
    }
  }, [sortedStudents, isMobile, selectedStudent]);

  useEffect(() => {
    // Populate mobile grades when a student is selected
    if (selectedStudent) {
      const newMobileGrades: Record<string, string> = {};
      sortedSubjects.forEach(subject => {
        const grade = gradesMap.get(`${selectedStudent.id}-${subject.id}`);
        newMobileGrades[subject.id] = String(grade?.nilai ?? '');
      });
      setMobileGrades(newMobileGrades);
    }
  }, [selectedStudent, gradesMap, sortedSubjects]);


  // --- Event Handlers ---
  const handleSaveGrade = async (siswaId: string, kurikulumId: string, value: string) => {
    if (!isAdmin || !firestore) return;
    if (value.trim() === '') return true; // Skip saving if value is empty

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

  const handleMobileGradeChange = (kurikulumId: string, value: string) => {
    setMobileGrades(prev => ({...prev, [kurikulumId]: value}));
  };

  const handleSaveMobileGrades = async () => {
    if (!selectedStudent || !isAdmin) return;

    const promises = Object.entries(mobileGrades).map(([kurikulumId, value]) => {
      // No need to check for empty string here, handleSaveGrade does it.
      return handleSaveGrade(selectedStudent.id, kurikulumId, value);
    });

    const results = await Promise.all(promises);
    const allSucceeded = results.every(res => res);
    
    if (allSucceeded) {
       toast({ title: 'Sukses!', description: `Nilai untuk ${selectedStudent.nama} telah disimpan.`});
    } else {
       toast({ variant: 'destructive', title: 'Gagal Sebagian!', description: 'Beberapa nilai gagal disimpan. Periksa kembali nilai yang Anda masukkan.'});
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

  const renderMobileView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-22rem)]">
      <Card className="col-span-1 md:col-span-1 h-full">
        <CardContent className="p-2 h-full">
          <ScrollArea className="h-full">
            {sortedStudents.map(student => (
              <button
                key={student.id}
                className={`w-full text-left p-3 rounded-md transition-colors ${selectedStudent?.id === student.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                onClick={() => setSelectedStudent(student)}
              >
                <p className="font-medium truncate">{student.nama}</p>
                <p className={`text-xs ${selectedStudent?.id === student.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{student.nis}</p>
              </button>
            ))}
            {isLoading && <p className="p-3 text-sm text-muted-foreground">Memuat siswa...</p>}
            {!isLoading && sortedStudents.length === 0 && <p className="p-3 text-sm text-muted-foreground">Tidak ada siswa.</p>}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="col-span-1 md:col-span-2 h-full">
        <CardContent className="p-0 h-full flex flex-col">
          {selectedStudent ? (
            <>
              <div className="p-4 border-b">
                <h3 className="font-bold">{selectedStudent.nama}</h3>
                <p className="text-sm text-muted-foreground">Input nilai untuk semester {selectedSemester}</p>
              </div>
              <ScrollArea className="flex-grow p-4">
                <div className="space-y-4">
                  {sortedSubjects.map(subject => (
                    <div key={subject.id} className="grid grid-cols-3 items-center gap-2">
                      <label htmlFor={`grade-${subject.id}`} className="col-span-2 text-sm font-medium truncate" title={subject.mataPelajaran}>
                        {subject.mataPelajaran}
                      </label>
                      <Input
                        id={`grade-${subject.id}`}
                        type="number"
                        placeholder="0-100"
                        value={mobileGrades[subject.id] ?? ''}
                        onChange={(e) => handleMobileGradeChange(subject.id, e.target.value)}
                        disabled={!isAdmin}
                        className="text-center"
                      />
                    </div>
                  ))}
                  {sortedSubjects.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Tidak ada mata pelajaran.</p>}
                </div>
              </ScrollArea>
              {isAdmin && (
                <div className="p-4 border-t">
                  <Button onClick={handleSaveMobileGrades} className="w-full">
                    <Save className="mr-2 h-4 w-4" /> Simpan Nilai
                  </Button>
                </div>
              )}
            </>
          ) : (
             <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Pilih siswa untuk input nilai.</p>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderDesktopView = () => (
     <div className="border rounded-lg overflow-hidden bg-card">
        <div className="relative w-full overflow-auto">
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
        </div>
    </div>
  );

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20 h-full flex flex-col">
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
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
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

    
    