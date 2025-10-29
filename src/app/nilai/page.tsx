
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Siswa, Kurikulum, Nilai, Guru, NilaiSiswa } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import { Search, FileDown, Upload, CalendarIcon } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdmin } from '@/context/AdminProvider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function NilaiPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isAdmin } = useAdmin();

  const [selectedKelas, setSelectedKelas] = useState('1');
  const [selectedSemester, setSelectedSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [waliKelas, setWaliKelas] = useState('');
  const [kepalaMadrasah, setKepalaMadrasah] = useState('');
  const [tahunPelajaran, setTahunPelajaran] = useState('');
  const [tanggal, setTanggal] = useState<Date | undefined>(new Date());
  
  const [grades, setGrades] = useState<Nilai[]>([]);
  const [studentTermData, setStudentTermData] = useState<NilaiSiswa[]>([]);
  const [isSubDataLoading, setIsSubDataLoading] = useState(true);

  // --- Data Fetching ---
  const siswaQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const kelasNum = parseInt(selectedKelas, 10);
    if (isNaN(kelasNum)) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'), where('kelas', '==', kelasNum));
  }, [firestore, user, selectedKelas]);
  const { data: students, isLoading: studentsLoading } = useCollection<Siswa>(siswaQuery);

  const guruQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'gurus');
  }, [firestore, user]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Guru>(guruQuery);
  
  const kurikulumQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'kurikulum'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Kurikulum>(kurikulumQuery);

  useEffect(() => {
    if (!firestore || !user || !selectedKelas) return;
    
    const kelasNum = parseInt(selectedKelas, 10);
    if (isNaN(kelasNum)) return;

    const fetchSubData = async () => {
        setIsSubDataLoading(true);
        try {
            const nilaiQuery = query(
                collection(firestore, 'nilai'),
                where('kelas', '==', kelasNum),
                where('semester', '==', selectedSemester)
            );
            const nilaiSnapshot = await getDocs(nilaiQuery);
            const gradesData = nilaiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Nilai));
            setGrades(gradesData);

            const nilaiSiswaQuery = query(
                collection(firestore, 'nilaiSiswa'),
                where('kelas', '==', kelasNum),
                where('semester', '==', selectedSemester)
            );
            const nilaiSiswaSnapshot = await getDocs(nilaiSiswaQuery);
            const studentTermDataArr = nilaiSiswaSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NilaiSiswa));
            setStudentTermData(studentTermDataArr);

        } catch (error) {
            console.error("Failed to fetch grades or student term data:", error);
            toast({ variant: "destructive", title: "Gagal memuat data nilai", description: "Terjadi kesalahan saat mengambil data." });
        } finally {
            setIsSubDataLoading(false);
        }
    };

    fetchSubData();
}, [firestore, user, selectedKelas, selectedSemester, toast]);
  
  // --- Memoized Data Processing ---
  const { waliKelasOptions, kepalaMadrasahOptions } = useMemo(() => {
    if (!teachers) return { waliKelasOptions: [], kepalaMadrasahOptions: [] };
    
    const waliKelasOptions = teachers.filter(t => t.position === `Wali Kelas ${selectedKelas}`);
    const kepalaMadrasahOptions = teachers.filter(t => t.position.toLowerCase().includes('kepala madrasah'));

    return { waliKelasOptions, kepalaMadrasahOptions };
  }, [teachers, selectedKelas]);

  // Auto-select wali kelas and kepala madrasah if only one option is available
  useEffect(() => {
    if (waliKelasOptions.length === 1 && !waliKelas) {
      setWaliKelas(waliKelasOptions[0].id);
    }
  }, [waliKelasOptions, waliKelas]);

  useEffect(() => {
    if (kepalaMadrasahOptions.length === 1 && !kepalaMadrasah) {
      setKepalaMadrasah(kepalaMadrasahOptions[0].id);
    }
  }, [kepalaMadrasahOptions, kepalaMadrasah]);


  const sortedSubjects = useMemo(() => {
    if (!subjects) return [];
    return [...subjects].sort((a,b) => a.kode.localeCompare(b.kode));
  }, [subjects]);

  const gradesMap = useMemo(() => {
    const map = new Map<string, Nilai>();
    grades.forEach(grade => {
      const key = `${grade.siswaId}-${grade.kurikulumId}`;
      map.set(key, grade);
    });
    return map;
  }, [grades]);
  
  const studentTermDataMap = useMemo(() => {
    const map = new Map<string, NilaiSiswa>();
    studentTermData.forEach(data => {
        map.set(data.siswaId, data);
    });
    return map;
  }, [studentTermData]);

  const studentStats = useMemo(() => {
    const stats = new Map<string, { sum: number; average: number }>();
    const ranks = new Map<string, number>();

    if (!students || students.length === 0 || !sortedSubjects) {
      return { stats, ranks };
    }

    students.forEach(student => {
      let sum = 0;
      let count = 0;
      sortedSubjects.forEach(subject => {
        const grade = gradesMap.get(`${student.id}-${subject.id}`);
        if (grade?.nilai) {
          sum += grade.nilai;
          count++;
        }
      });
      const average = count > 0 ? sum / count : 0;
      stats.set(student.id, { sum, average });
    });

    const sortedByAverage = [...students].sort((a, b) => {
      const avgA = stats.get(a.id)?.average || 0;
      const avgB = stats.get(b.id)?.average || 0;
      return avgB - avgA;
    });

    let rank = 1;
    for (let i = 0; i < sortedByAverage.length; i++) {
        const currentStudent = sortedByAverage[i];
        if (i > 0) {
            const prevStudent = sortedByAverage[i-1];
            const currentAvg = stats.get(currentStudent.id)?.average || 0;
            const prevAvg = stats.get(prevStudent.id)?.average || 0;
            if (currentAvg < prevAvg) {
                rank = i + 1;
            }
        }
        ranks.set(currentStudent.id, rank);
    }
    
    return { stats, ranks };
  }, [students, sortedSubjects, gradesMap]);


  const sortedStudents = useMemo(() => {
    if (!students) return [];
    let filtered = students.filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || s.nis.includes(searchQuery));
    return filtered.sort((a, b) => {
       const rankA = studentStats.ranks.get(a.id) || Infinity;
       const rankB = studentStats.ranks.get(b.id) || Infinity;
       if (rankA !== rankB) return rankA - rankB;
       return a.nama.localeCompare(b.nama);
    });
  }, [students, searchQuery, studentStats.ranks]);
  
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
    if (!firestore || !isAdmin) return true;
    const trimmedValue = value.trim();

    const existingGrade = gradesMap.get(`${siswaId}-${kurikulumId}`);

    if (trimmedValue === '') {
        if(existingGrade) {
          try {
            await deleteDocumentNonBlocking(doc(firestore, 'nilai', existingGrade.id));
            setGrades(prev => prev.filter(g => g.id !== existingGrade.id));
            toast({ title: 'Sukses!', description: 'Nilai berhasil dihapus.'});
          } catch(error) {
             toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menghapus nilai.'});
          }
        }
        return true;
    }

    const newNilai = parseInt(trimmedValue, 10);
    if (isNaN(newNilai) || newNilai < 0 || newNilai > 100) {
      toast({ variant: 'destructive', title: 'Nilai tidak valid', description: 'Masukkan angka antara 0 dan 100.' });
      return false;
    }

    try {
        if (existingGrade) {
            if (existingGrade.nilai !== newNilai) {
                const gradeRef = doc(firestore, 'nilai', existingGrade.id);
                await setDocumentNonBlocking(gradeRef, { nilai: newNilai }, { merge: true });
                setGrades(prev => prev.map(g => g.id === existingGrade.id ? { ...g, nilai: newNilai } : g));
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
            await setDocumentNonBlocking(newGradeRef, newGradeData, {});
            setGrades(prev => [...prev, { ...newGradeData, id: newGradeRef.id }]);
        }
        toast({ title: 'Sukses!', description: 'Nilai berhasil disimpan.'});
        return true;
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menyimpan nilai.'});
        return false;
    }
  };

  const handleSaveStudentTermData = async (siswaId: string, field: 'sakit' | 'izin' | 'alpa' | 'keputusan', value: string | number) => {
    if (!firestore || !isAdmin) return;

    const docId = `${siswaId}-${selectedKelas}-${selectedSemester}`;
    const docRef = doc(firestore, 'nilaiSiswa', docId);

    const dataToSet = {
        siswaId,
        kelas: Number(selectedKelas),
        semester: selectedSemester,
        [field]: value
    };

    try {
        await setDocumentNonBlocking(docRef, dataToSet, { merge: true });
        const existingData = studentTermData.find(d => d.id === docId);
        if (existingData) {
            setStudentTermData(prev => prev.map(d => d.id === docId ? {...d, [field]: value} : d));
        } else {
            setStudentTermData(prev => [...prev, {id: docId, ...dataToSet} as NilaiSiswa]);
        }
        toast({ title: 'Sukses!', description: 'Data siswa berhasil disimpan.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menyimpan data.' });
    }
  }
  
  const handleExport = (format: 'pdf' | 'csv') => {
    const head = ['Peringkat', 'Nama', 'NIS', ...sortedSubjects.map(s => s.mataPelajaran), 'Jumlah', 'Rata-rata'];
    const body = sortedStudents.map(student => {
        const stats = studentStats.stats.get(student.id);
        return [
            studentStats.ranks.get(student.id) || '-',
            student.nama,
            student.nis,
            ...sortedSubjects.map(subject => {
                const grade = gradesMap.get(`${student.id}-${subject.id}`);
                return grade?.nilai ?? '';
            }),
            stats?.sum.toFixed(0) || '0',
            stats?.average.toFixed(2) || '0.00',
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
        const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Nilai");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setImportFile(event.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    if (!students || !sortedSubjects) return;
    const headers = ["nis", "nama_siswa", ...sortedSubjects.map(s => s.kode)];
    const ws = XLSX.utils.json_to_sheet([], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `template_nilai_kelas_${selectedKelas}_${selectedSemester}.xlsx`);
  };
  
  const handleImport = async () => {
    if (!importFile || !firestore) {
      toast({ variant: "destructive", title: "Gagal", description: "File atau koneksi database tidak tersedia." });
      return;
    }
    const studentList = students;
    const subjectList = sortedSubjects;
    
    if (!studentList || !subjectList) {
        toast({ variant: "destructive", title: "Gagal", description: "Data siswa atau mata pelajaran belum dimuat." });
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const importedData = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (importedData.length === 0) {
              toast({ variant: "destructive", title: "File Kosong", description: "File Excel tidak berisi data." });
              return;
            }

            const batch = writeBatch(firestore);
            const subjectMapByCode = new Map(subjectList.map(s => [s.kode, s.id]));
            const studentMapByNis = new Map(studentList.map(s => [s.nis, s.id]));

            let newGrades: Nilai[] = [...grades];

            importedData.forEach(row => {
              const nis = String(row.nis);
              const siswaId = studentMapByNis.get(nis);

              if (siswaId) {
                Object.keys(row).forEach(header => {
                  const kurikulumId = subjectMapByCode.get(header);
                  if (kurikulumId) {
                    const nilaiStr = row[header];
                    if (nilaiStr !== null && nilaiStr !== undefined && String(nilaiStr).trim() !== '') {
                      const nilai = parseInt(String(nilaiStr), 10);
                      if (!isNaN(nilai) && nilai >= 0 && nilai <= 100) {
                        const existingGrade = gradesMap.get(`${siswaId}-${kurikulumId}`);
                        if (existingGrade) {
                          const gradeRef = doc(firestore, 'nilai', existingGrade.id);
                          batch.update(gradeRef, { nilai });
                          newGrades = newGrades.map(g => g.id === existingGrade.id ? { ...g, nilai } : g);
                        } else {
                          const newGradeRef = doc(collection(firestore, 'nilai'));
                          const newGradeData: Omit<Nilai, 'id'> = {
                            siswaId,
                            kurikulumId,
                            kelas: Number(selectedKelas),
                            semester: selectedSemester,
                            nilai,
                          };
                          batch.set(newGradeRef, newGradeData);
                          newGrades.push({ ...newGradeData, id: newGradeRef.id });
                        }
                      }
                    }
                  }
                });
              }
            });

            await batch.commit();
            setGrades(newGrades); // Manually update state
            toast({ title: 'Import Berhasil!', description: `Nilai berhasil diperbarui dari file.` });
        } catch (error) {
            console.error("Error importing grades:", error);
            toast({ variant: "destructive", title: 'Gagal', description: "Terjadi kesalahan saat mengimpor nilai." });
        } finally {
            setIsImportDialogOpen(false);
            setImportFile(null);
        }
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        toast({ variant: "destructive", title: 'Gagal Parsing', description: 'Tidak dapat memproses file Excel.' });
    };
    reader.readAsBinaryString(importFile);
  };


  const isLoading = studentsLoading || subjectsLoading || teachersLoading || isSubDataLoading;

  const renderMobileView = () => (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      <Card className="w-full md:w-1/3 flex flex-col">
        <CardContent className="p-2 flex-grow">
          <ScrollArea className="h-full">
            {isLoading && <p className="p-4 text-center">Memuat siswa...</p>}
            {!isLoading && sortedStudents.length === 0 && <p className="p-4 text-center">Tidak ada siswa.</p>}
            {sortedStudents.map(student => {
              const rank = studentStats.ranks.get(student.id);
              return (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-colors flex justify-between items-center",
                  selectedStudent?.id === student.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <div>
                  <p className="font-semibold">{student.nama}</p>
                  <p className={cn("text-xs", selectedStudent?.id === student.id ? "text-primary-foreground/80" : "text-muted-foreground")}>{student.nis}</p>
                </div>
                 {rank && (
                    <span className={cn(
                        "text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full",
                        rank === 1 ? "bg-yellow-400 text-yellow-900" : (selectedStudent?.id === student.id ? "bg-white/20" : "bg-muted text-muted-foreground")
                    )}>
                        {rank}
                    </span>
                 )}
              </button>
            )})}
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
                        className="w-24 text-center"
                        placeholder="-"
                        disabled={!isAdmin}
                      />
                    </div>
                  );
                })}
                {sortedSubjects.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                        <div className="flex justify-between font-medium">
                            <span>Jumlah Nilai:</span>
                            <span>{studentStats.stats.get(selectedStudent.id)?.sum.toFixed(0) || 0}</span>
                        </div>
                         <div className="flex justify-between font-medium text-muted-foreground">
                            <span>Rata-rata:</span>
                            <span>{studentStats.stats.get(selectedStudent.id)?.average.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  const renderDesktopView = () => (
    <div className="flex-1 relative">
      <ScrollArea className="absolute inset-0">
        <Table className='min-w-max'>
          <TableHeader className='sticky top-0 z-10 bg-card'>
            <TableRow>
              <TableHead className="font-headline sticky left-0 bg-card z-20 w-[200px] shadow-sm">Nama Siswa</TableHead>
              <TableHead className="font-headline w-[120px]">NIS</TableHead>
              {sortedSubjects.map(subject => (
                <TableHead key={subject.id} className="font-headline text-center min-w-[150px]">{subject.mataPelajaran}</TableHead>
              ))}
              <TableHead className="font-headline text-center">Jumlah Nilai</TableHead>
              <TableHead className="font-headline text-center">Rata-rata</TableHead>
              <TableHead className="font-headline text-center">Peringkat</TableHead>
              <TableHead className="font-headline text-center">Sakit</TableHead>
              <TableHead className="font-headline text-center">Izin</TableHead>
              <TableHead className="font-headline text-center">Alpa</TableHead>
              <TableHead className="font-headline text-center min-w-[200px]">Keputusan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={sortedSubjects.length + 9} className="text-center h-24">Memuat data...</TableCell></TableRow>}
            {!isLoading && sortedStudents.length === 0 && <TableRow><TableCell colSpan={sortedSubjects.length + 9} className="text-center h-24">Tidak ada siswa di kelas ini.</TableCell></TableRow>}
            {sortedStudents.map(student => {
              const stats = studentStats.stats.get(student.id);
              const rank = studentStats.ranks.get(student.id);
              const termData = studentTermDataMap.get(student.id);
              return (
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
                        className="min-w-[70px] text-center mx-auto"
                        placeholder="-"
                        disabled={!isAdmin}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="text-center font-medium">{stats?.sum.toFixed(0) || 0}</TableCell>
                <TableCell className="text-center font-medium">{stats?.average.toFixed(2) || '0.00'}</TableCell>
                <TableCell className="text-center font-bold text-lg">{rank || '-'}</TableCell>
                <TableCell>
                  <Input type="number" defaultValue={termData?.sakit} onBlur={(e) => handleSaveStudentTermData(student.id, 'sakit', parseInt(e.target.value) || 0)} className="w-16 text-center" disabled={!isAdmin} />
                </TableCell>
                <TableCell>
                  <Input type="number" defaultValue={termData?.izin} onBlur={(e) => handleSaveStudentTermData(student.id, 'izin', parseInt(e.target.value) || 0)} className="w-16 text-center" disabled={!isAdmin} />
                </TableCell>
                <TableCell>
                  <Input type="number" defaultValue={termData?.alpa} onBlur={(e) => handleSaveStudentTermData(student.id, 'alpa', parseInt(e.target.value) || 0)} className="w-16 text-center" disabled={!isAdmin} />
                </TableCell>
                <TableCell>
                  <Input type="text" defaultValue={termData?.keputusan} onBlur={(e) => handleSaveStudentTermData(student.id, 'keputusan', e.target.value)} className="min-w-[200px]" disabled={!isAdmin} />
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );


  return (
    <div className="bg-background flex flex-col h-full md:h-[calc(100vh_-_theme(spacing.16))] pb-32 md:pb-0">
      <div className="container flex flex-col py-12 md:py-8 flex-1 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Input Nilai Siswa</h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola nilai siswa per mata pelajaran secara interaktif.
            </p>
          </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {isAdmin && (
                    <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm">
                        <Upload className="mr-2 h-4 w-4" /> Import Excel
                    </Button>
                )}
                <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
                </Button>
                <Button onClick={() => handleExport('csv')} variant="outline" size="sm">
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor Excel
                </Button>
            </div>
        </div>

        <div className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <div className="relative col-span-2 md:col-span-3 lg:col-span-1">
                <Label>Cari Siswa</Label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground mt-3" />
                <Input
                placeholder="Cari Nama atau NIS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 mt-1"
                />
            </div>
            <div>
                <Label>Kelas</Label>
                <Select value={selectedKelas} onValueChange={(v) => { setSelectedKelas(v); setSearchQuery('');}}>
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
            <div>
                <Label>Semester</Label>
                <Select value={selectedSemester} onValueChange={(v) => setSelectedSemester(v as any)}>
                    <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Pilih Semester" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ganjil">Semester Ganjil</SelectItem>
                        <SelectItem value="genap">Semester Genap</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label>Tahun Pelajaran</Label>
                 <Input className="mt-1" placeholder="e.g. 2023/2024" value={tahunPelajaran} onChange={(e) => setTahunPelajaran(e.target.value)} />
            </div>
             <div className="lg:col-span-1">
                <Label>Tanggal</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !tanggal && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {tanggal ? format(tanggal, "PPP") : <span>Pilih tanggal</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={tanggal}
                        onSelect={setTanggal}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>
             <div className="lg:col-span-1">
                <Label>Wali Kelas</Label>
                <Select value={waliKelas} onValueChange={setWaliKelas} disabled={teachersLoading}>
                    <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Pilih Wali Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                        {waliKelasOptions?.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="lg:col-span-2">
                <Label>Kepala Madrasah</Label>
                <Select value={kepalaMadrasah} onValueChange={setKepalaMadrasah} disabled={teachersLoading}>
                    <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Pilih Kepala Madrasah" />
                    </SelectTrigger>
                    <SelectContent>
                       {kepalaMadrasahOptions?.map(teacher => (
                            <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {isMobile ? renderMobileView() : renderDesktopView()}
        </div>

        {isAdmin && (
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Import Nilai dari Excel</DialogTitle>
                <DialogDescription>
                    Pilih file Excel untuk import nilai. Gunakan KODE mata pelajaran sebagai header kolom.
                    Data nilai yang sudah ada akan diperbarui.
                </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                    <Input 
                    id="import-file" 
                    type="file" 
                    accept=".xlsx, .xls"
                    onChange={handleImportFileChange}
                    ref={importInputRef} 
                    />
                </div>
                    <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplate} disabled={!subjects || subjects.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {subjects && subjects.length > 0 ? `Unduh Template Excel untuk Kelas ${selectedKelas}` : 'Pilih kelas dengan mapel dahulu'}
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
        )}
      </div>
    </div>
  );
}
