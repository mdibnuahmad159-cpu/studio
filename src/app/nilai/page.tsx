
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
import { Siswa, Kurikulum, Nilai } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import { Search, FileDown, Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAdmin } from '@/context/AdminProvider';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

interface StudentStats {
  sum: number;
  average: number;
  rank: number;
}

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
    if (!user) return null;
    return query(
      collection(firestore, 'nilai'),
      where('kelas', '==', Number(selectedKelas)),
      where('semester', '==', selectedSemester)
    );
  }, [firestore, user, selectedKelas, selectedSemester]);
  const { data: grades, isLoading: gradesLoading } = useCollection<Nilai>(nilaiQuery);
  
  // --- Memoized Data Processing ---
  const sortedSubjects = useMemo(() => {
    return subjects?.sort((a,b) => a.kode.localeCompare(b.kode)) || [];
  }, [subjects]);

  const gradesMap = useMemo(() => {
    const map = new Map<string, Nilai>();
    grades?.forEach(grade => {
      const key = `${grade.siswaId}-${grade.kurikulumId}`;
      map.set(key, grade);
    });
    return map;
  }, [grades]);
  
  const studentStats = useMemo(() => {
    const stats = new Map<string, { sum: number; average: number }>();
    if (!students || sortedSubjects.length === 0) return { stats, ranks: new Map() };

    students.forEach(student => {
      let sum = 0;
      sortedSubjects.forEach(subject => {
        const grade = gradesMap.get(`${student.id}-${subject.id}`);
        if (grade) {
          sum += grade.nilai;
        }
      });
      const average = sortedSubjects.length > 0 ? sum / sortedSubjects.length : 0;
      stats.set(student.id, { sum, average });
    });

    const sortedByAverage = [...students].sort((a, b) => {
      const avgA = stats.get(a.id)?.average || 0;
      const avgB = stats.get(b.id)?.average || 0;
      return avgB - avgA;
    });

    const ranks = new Map<string, number>();
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

    await new Promise(resolve => {
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
                            }
                          }
                        }
                      }
                    });
                  }
                });

                await batch.commit();
                toast({ title: 'Import Berhasil!', description: `Nilai berhasil diperbarui dari file.` });
            } catch (error) {
                console.error("Error importing grades:", error);
                toast({ variant: "destructive", title: 'Gagal', description: "Terjadi kesalahan saat mengimpor nilai." });
            } finally {
                setIsImportDialogOpen(false);
                setImportFile(null);
                resolve(true);
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            toast({ variant: "destructive", title: 'Gagal Parsing', description: 'Tidak dapat memproses file Excel.' });
            resolve(true);
        };
        reader.readAsBinaryString(importFile);
    });
  };


  const isLoading = studentsLoading || subjectsLoading || gradesLoading;

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
    <ScrollArea className="w-full whitespace-nowrap border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-headline sticky left-0 bg-card z-10 w-[200px] shadow-sm">Nama Siswa</TableHead>
            <TableHead className="font-headline w-[120px]">NIS</TableHead>
            {sortedSubjects.map(subject => (
              <TableHead key={subject.id} className="font-headline text-center min-w-[150px]">{subject.mataPelajaran}</TableHead>
            ))}
            <TableHead className="font-headline text-center">Jumlah Nilai</TableHead>
            <TableHead className="font-headline text-center">Rata-rata</TableHead>
            <TableHead className="font-headline text-center">Peringkat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={sortedSubjects.length + 5} className="text-center h-24">Memuat data...</TableCell></TableRow>}
          {!isLoading && sortedSubjects.length === 0 && <TableRow><TableCell colSpan={sortedSubjects.length + 5} className="text-center h-24">Tidak ada siswa di kelas ini.</TableCell></TableRow>}
          {sortedStudents.map(student => {
            const stats = studentStats.stats.get(student.id);
            const rank = studentStats.ranks.get(student.id);
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
            </TableRow>
          )})}
        </TableBody>
      </Table>
      <div className="h-1" />
    </ScrollArea>
  );


  return (
    <div className="bg-background pb-32 md:pb-0">
      <div className="container flex flex-col py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
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
        
        <div className="flex-1 overflow-auto">
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
