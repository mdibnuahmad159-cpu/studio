
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
import { useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Search, FileDown, Upload, CalendarIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];


// New component to handle individual student term data fetching and updating
const StudentTermDataCell = ({
  studentId,
  kelas,
  semester,
  field,
}: {
  studentId: string;
  kelas: number;
  semester: 'ganjil' | 'genap';
  field: 'sakit' | 'izin' | 'alpa' | 'keputusan';
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const docId = useMemo(() => `${studentId}-${kelas}-${semester}`, [studentId, kelas, semester]);
  
  const docRef = useMemoFirebase(() => {
    if (!firestore || !docId) return null;
    return doc(firestore, 'nilaiSiswa', docId);
  }, [firestore, docId]);

  const { data: termData, isLoading } = useDoc<NilaiSiswa>(docRef);

  const handleSave = async (value: string | number) => {
    if (!firestore) return;
    const dataToSet = {
        siswaId: studentId,
        kelas: kelas,
        semester: semester,
        [field]: value
    };
    try {
        await setDocumentNonBlocking(docRef!, dataToSet, { merge: true });
        toast({ title: 'Sukses!', description: 'Data siswa berhasil disimpan.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menyimpan data.' });
    }
  }

  return (
      <Input
        type={field === 'keputusan' ? 'text' : 'number'}
        defaultValue={termData?.[field] as any}
        onBlur={(e) => handleSave(field === 'keputusan' ? e.target.value : parseInt(e.target.value) || 0)}
        className={cn(
          "min-w-[70px] text-center",
          field === 'keputusan' && "min-w-[200px]"
        )}
        disabled={isLoading}
        placeholder={isLoading ? "..." : "-"}
      />
  );
}


export default function NilaiPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedKelas, setSelectedKelas] = useState('1');
  const [selectedSemester, setSelectedSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [tahunPelajaran, setTahunPelajaran] = useState('');
  const [tanggal, setTanggal] = useState<Date | undefined>(new Date());
  
  const kelasNum = useMemo(() => parseInt(selectedKelas, 10), [selectedKelas]);
  
  // --- Data Fetching ---
  const siswaQuery = useMemoFirebase(() => {
    if (!firestore || !user || isNaN(kelasNum)) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'), where('kelas', '==', kelasNum));
  }, [firestore, user, kelasNum]);
  const { data: students, isLoading: studentsLoading } = useCollection<Siswa>(siswaQuery);

  const guruQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'gurus');
  }, [firestore, user]);
  const { data: teachers, isLoading: teachersLoading } = useCollection<Guru>(guruQuery);
  
  const kurikulumQuery = useMemoFirebase(() => {
    if (!firestore || !user || isNaN(kelasNum)) return null;
    return query(collection(firestore, 'kurikulum'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Kurikulum>(kurikulumQuery);

  const studentIds = useMemo(() => students?.map(s => s.id) || [], [students]);

  const nilaiQuery = useMemoFirebase(() => {
    if (!firestore || !user || isNaN(kelasNum) || studentIds.length === 0) return null;
    return query(
      collection(firestore, 'nilai'),
      where('kelas', '==', kelasNum),
      where('semester', '==', selectedSemester),
      where('siswaId', 'in', studentIds)
    );
  }, [firestore, user, kelasNum, selectedSemester, studentIds]);
  const { data: grades, isLoading: gradesLoading } = useCollection<Nilai>(nilaiQuery);
  
  // --- Memoized Data Processing ---
  const sortedSubjects = useMemo(() => {
    if (!subjects) return [];
    return [...subjects].sort((a,b) => a.kode.localeCompare(b.kode));
  }, [subjects]);

  const gradesMap = useMemo(() => {
    const map = new Map<string, Nilai>();
    if (!grades) return map;
    grades.forEach(grade => {
      const key = `${grade.siswaId}-${grade.kurikulumId}`;
      map.set(key, grade);
    });
    return map;
  }, [grades]);
  

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
    if (!firestore) return true;
    const trimmedValue = value.trim();

    const existingGrade = gradesMap.get(`${siswaId}-${kurikulumId}`);

    if (trimmedValue === '') {
        if(existingGrade) {
          try {
            await deleteDocumentNonBlocking(doc(firestore, 'nilai', existingGrade.id));
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
        const gradeRef = existingGrade 
          ? doc(firestore, 'nilai', existingGrade.id) 
          : doc(collection(firestore, 'nilai'));

        const gradeData = {
          siswaId,
          kurikulumId,
          kelas: Number(selectedKelas),
          semester: selectedSemester,
          nilai: newNilai,
        };

        await setDocumentNonBlocking(gradeRef, gradeData, { merge: true });
        
        toast({ title: 'Sukses!', description: 'Nilai berhasil disimpan.'});
        return true;
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menyimpan nilai.'});
        return false;
    }
  };
  
  const handleExport = (format: 'pdf' | 'csv') => {
    if (!students || !teachers || !sortedSubjects) return;

    const waliKelasData = teachers.find(t => t.position === `Wali Kelas ${selectedKelas}`);
    const kepalaMadrasahData = teachers.find(t => t.position.toLowerCase().includes('kepala madrasah'));

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
        doc.text(`Data Nilai Kelas ${selectedKelas} - Semester ${selectedSemester}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Tahun Pelajaran: ${tahunPelajaran || '-'}`, 14, 20);

        doc.autoTable({
            head: [head],
            body: body,
            startY: 25,
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const textY = doc.internal.pageSize.height - 30;
            const textX = doc.internal.pageSize.width - 14;
            const signatureX = textX - 100;

            doc.text(`Tanggal: ${tanggal ? format(tanggal, "dd MMMM yyyy") : '-'}`, signatureX, textY);
            doc.text(`Wali Kelas: ${waliKelasData?.name || '-'}`, signatureX, textY + 5);
            doc.text(`Kepala Madrasah: ${kepalaMadrasahData?.name || '-'}`, signatureX, textY + 10);
        }
        
        doc.save(`${filename}.pdf`);
    } else {
        const exportData = [
            [`Data Nilai Kelas ${selectedKelas} - Semester ${selectedSemester}`],
            [`Tahun Pelajaran: ${tahunPelajaran || '-'}`],
            [`Wali Kelas: ${waliKelasData?.name || '-'}`],
            [`Kepala Madrasah: ${kepalaMadrasahData?.name || '-'}`],
            [], // Empty row for spacing
            head,
            ...body
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(exportData);
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
    if (!subjects) return;
    const headers = ["nis", "nama_siswa", ...sortedSubjects.map(s => s.kode)];
    const ws = XLSX.utils.json_to_sheet([], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `template_nilai_kelas_${selectedKelas}_${selectedSemester}.xlsx`);
  };
  
  const handleImport = async () => {
    if (!importFile || !firestore || !students || !subjects) {
      toast({ variant: "destructive", title: "Gagal", description: "Data prasyarat (file, siswa, atau mapel) tidak tersedia." });
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

            const subjectMapByCode = new Map(subjects.map(s => [s.kode, s.id]));
            const studentMapByNis = new Map(students.map(s => [s.nis, s.id]));
            const batch = writeBatch(firestore);

            for (const row of importedData) {
              const nis = String(row.nis);
              const siswaId = studentMapByNis.get(nis);

              if (siswaId) {
                for (const header of Object.keys(row)) {
                  const kurikulumId = subjectMapByCode.get(header);
                  if (kurikulumId) {
                    const nilaiStr = row[header];
                    if (nilaiStr !== null && nilaiStr !== undefined && String(nilaiStr).trim() !== '') {
                      const nilai = parseInt(String(nilaiStr), 10);
                      if (!isNaN(nilai) && nilai >= 0 && nilai <= 100) {
                        const existingGradeId = gradesMap.get(`${siswaId}-${kurikulumId}`)?.id;
                        const gradeRef = existingGradeId ? doc(firestore, 'nilai', existingGradeId) : doc(collection(firestore, 'nilai'));
                        
                        const gradeData = {
                            siswaId,
                            kurikulumId,
                            kelas: Number(selectedKelas),
                            semester: selectedSemester,
                            nilai,
                        };
                        batch.set(gradeRef, gradeData, { merge: true });
                      }
                    }
                  }
                }
              }
            }
            await batch.commit();
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


  const isLoading = studentsLoading || subjectsLoading || teachersLoading || gradesLoading;

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
    <div className="flex-grow min-h-0">
        <ScrollArea className="h-full">
            <Table>
            <TableHeader className='sticky top-0 z-10 bg-card'>
                <TableRow>
                <TableHead className="font-headline sticky left-0 bg-card z-20 w-[200px] shadow-sm">Nama Siswa</TableHead>
                <TableHead className="font-headline w-[120px]">NIS</TableHead>
                {sortedSubjects.map(subject => (
                    <TableHead key={subject.id} className="font-headline text-center min-w-[150px]">{subject.mataPelajaran}</TableHead>
                ))}
                <TableHead className="font-headline text-center">Jumlah</TableHead>
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
                return (
                <TableRow key={student.id}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10">{student.nama}</TableCell>
                    <TableCell>{student.nis}</TableCell>
                    {sortedSubjects.map(subject => {
                    const grade = gradesMap.get(`${student.id}-${subject.id}`);
                    return (
                        <TableCell key={subject.id} className="text-center p-1">
                        <Input
                            type="number"
                            defaultValue={grade?.nilai}
                            onBlur={(e) => handleSaveGrade(student.id, subject.id, e.target.value)}
                            className="min-w-[70px] text-center mx-auto"
                            placeholder="-"
                        />
                        </TableCell>
                    );
                    })}
                    <TableCell className="text-center font-medium">{stats?.sum.toFixed(0) || 0}</TableCell>
                    <TableCell className="text-center font-medium">{stats?.average.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-center font-bold text-lg">{rank || '-'}</TableCell>
                    <TableCell className="p-1"><StudentTermDataCell studentId={student.id} kelas={kelasNum} semester={selectedSemester} field="sakit" /></TableCell>
                    <TableCell className="p-1"><StudentTermDataCell studentId={student.id} kelas={kelasNum} semester={selectedSemester} field="izin" /></TableCell>
                    <TableCell className="p-1"><StudentTermDataCell studentId={student.id} kelas={kelasNum} semester={selectedSemester} field="alpa" /></TableCell>
                    <TableCell className="p-1"><StudentTermDataCell studentId={student.id} kelas={kelasNum} semester={selectedSemester} field="keputusan" /></TableCell>
                </TableRow>
                )})}
            </TableBody>
            </Table>
        </ScrollArea>
    </div>
  );


  return (
    <div className="bg-background flex flex-col h-[calc(100vh-8rem)]">
      <div className="container flex flex-col py-8 flex-1 min-h-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Input Nilai Siswa</h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola nilai siswa per mata pelajaran secara interaktif.
            </p>
          </div>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" /> Import Excel
                </Button>
                <Button onClick={() => handleExport('pdf')} variant="outline" size="sm" disabled={!students || students.length === 0}>
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
                </Button>
                <Button onClick={() => handleExport('csv')} variant="outline" size="sm" disabled={!students || students.length === 0}>
                  <FileDown className="mr-2 h-4 w-4" /> Ekspor Excel
                </Button>
            </div>
        </div>

        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="relative col-span-2 md:col-span-1">
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
             <div>
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
        </div>
        
        <div className="flex-grow min-h-0 flex flex-col">
          {isMobile ? renderMobileView() : renderDesktopView()}
        </div>

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
      </div>
    </div>
  );
}
