
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
import { Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function NilaiPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const [selectedKelas, setSelectedKelas] = useState('1');
  const [selectedSemester, setSelectedSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCell, setEditingCell] = useState<{ siswaId: string; kurikulumId: string; initialValue: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // --- Data Fetching ---
  const siswaQuery = useMemoFirebase(() => {
    if (!user || selectedKelas === 'all') return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'), where('kelas', '==', Number(selectedKelas)));
  }, [firestore, user, selectedKelas]);
  const { data: students, isLoading: studentsLoading } = useCollection<Siswa>(siswaQuery);

  const kurikulumQuery = useMemoFirebase(() => {
    if (!user || selectedKelas === 'all') return null;
    return query(collection(firestore, 'kurikulum'), where('kelas', '==', selectedKelas));
  }, [firestore, user, selectedKelas]);
  const { data: subjects, isLoading: subjectsLoading } = useCollection<Kurikulum>(kurikulumQuery);

  const nilaiQuery = useMemoFirebase(() => {
    if (!user || selectedKelas === 'all') return null;
    return query(
      collection(firestore, 'nilai'),
      where('kelas', '==', Number(selectedKelas)),
      where('semester', '==', selectedSemester)
    );
  }, [firestore, user, selectedKelas, selectedSemester]);
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

  // --- Event Handlers ---
  const handleCellClick = (siswaId: string, kurikulumId: string) => {
    if (!isAdmin) return;
    const grade = gradesMap.get(`${siswaId}-${kurikulumId}`);
    const initialValue = grade?.nilai ?? 0;
    setEditingCell({ siswaId, kurikulumId, initialValue });
    setEditValue(String(initialValue));
  };
  
  const handleSaveGrade = async () => {
    if (!editingCell || !firestore) return;

    const { siswaId, kurikulumId } = editingCell;
    const newNilai = parseInt(editValue, 10);
    if (isNaN(newNilai) || newNilai < 0 || newNilai > 100) {
      toast({ variant: 'destructive', title: 'Nilai tidak valid', description: 'Masukkan angka antara 0 dan 100.' });
      return;
    }

    const grade = gradesMap.get(`${siswaId}-${kurikulumId}`);
    const batch = writeBatch(firestore);

    if (grade) {
      // Update existing grade
      const gradeRef = doc(firestore, 'nilai', grade.id);
      batch.update(gradeRef, { nilai: newNilai });
    } else {
      // Create new grade
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
        setEditingCell(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal!', description: 'Tidak dapat menyimpan nilai.'});
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveGrade();
    } else if (event.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const isLoading = studentsLoading || subjectsLoading || gradesLoading;

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Input Nilai Siswa</h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola nilai siswa per mata pelajaran secara interaktif.
            </p>
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
        
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="relative w-full overflow-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline sticky left-0 bg-card z-10 w-[200px]">Nama Siswa</TableHead>
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
                      const isEditing = editingCell?.siswaId === student.id && editingCell?.kurikulumId === subject.id;
                      
                      return (
                        <TableCell key={subject.id} className="text-center cursor-pointer" onClick={() => handleCellClick(student.id, subject.id)}>
                            {isEditing ? (
                                <Popover open onOpenChange={() => setEditingCell(null)}>
                                  <PopoverTrigger asChild>
                                      <div className="font-bold text-lg">{grade?.nilai ?? '-'}</div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-40 p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                                      <Input 
                                          type="number"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onKeyDown={handleKeyDown}
                                          onBlur={() => setEditingCell(null)} // Close if blurred
                                          autoFocus
                                          className="text-center"
                                      />
                                       <Button size="sm" onClick={handleSaveGrade} className="w-full mt-2">Simpan</Button>
                                  </PopoverContent>
                                </Popover>
                            ) : (
                                <div className="font-bold text-lg text-primary">{grade?.nilai ?? '-'}</div>
                            )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
