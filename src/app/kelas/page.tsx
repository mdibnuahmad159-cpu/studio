
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
import { Siswa as DetailedStudent } from '@/lib/data';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, GraduationCap, FileDown, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, where, writeBatch } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function KelasPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const siswaAktifQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'));
  }, [firestore, user]);
  const { data: activeStudents, isLoading } = useCollection<DetailedStudent>(siswaAktifQuery);
  const { isAdmin } = useAdmin();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [filterKelas, setFilterKelas] = useState('all');
  const [alertInfo, setAlertInfo] = useState<{ title: string; description: string; onConfirm: () => void } | null>(null);
  const [isMoveClassDialogOpen, setIsMoveClassDialogOpen] = useState(false);
  const [targetClass, setTargetClass] = useState<string>('');
  const { toast } = useToast();

  const filteredStudents = useMemo(() => {
    if (!activeStudents) return [];
    let studentList = [...activeStudents];
    if (filterKelas !== 'all') {
      studentList = studentList.filter(s => String(s.kelas) === filterKelas);
    }
    return studentList.sort((a,b) => a.kelas - b.kelas || a.nama.localeCompare(b.nama));
  }, [activeStudents, filterKelas]);
  
  const handleSelectAll = (checked: boolean) => {
    if (!isAdmin) return;
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.nis));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (nis: string, checked: boolean) => {
    if (!isAdmin) return;
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
    return activeStudents?.filter(s => selectedStudents.includes(s.nis)) || [];
  };

  const currentKelasForSelection = useMemo(() => {
    const selectedDetails = getSelectedStudentsDetails();
    if (selectedStudents.length === 0) return null;
    const firstKelas = selectedDetails[0].kelas;
    if (selectedDetails.every(s => s.kelas === firstKelas)) {
      return firstKelas;
    }
    return 'mixed'; // Indicates selection across different classes
  }, [selectedStudents, activeStudents]);

  const createAlert = (title: string, description: string, onConfirm: () => void) => {
    setAlertInfo({ title, description, onConfirm });
  };
  
  const handleBatchUpdate = async (updateFn: (student: DetailedStudent) => any) => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    const selectedDetails = getSelectedStudentsDetails();
    selectedDetails.forEach(student => {
      const studentDocRef = doc(firestore, 'siswa', student.id);
      batch.update(studentDocRef, updateFn(student));
    });
    await batch.commit();
    setSelectedStudents([]);
  };

  const handlePromote = () => {
    const currentKelas = currentKelasForSelection;
    if (currentKelas === null || currentKelas === 'mixed' || currentKelas === 6) return;
    const studentNames = getSelectedStudentsDetails().map(s => s.nama).join(', ');
    createAlert(
      'Naik Kelas',
      `Anda yakin ingin menaikkan ${selectedStudents.length} siswa (${studentNames}) ke kelas ${currentKelas + 1}?`,
      async () => {
        await handleBatchUpdate(student => ({ kelas: student.kelas + 1 }));
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
      async () => {
        await handleBatchUpdate(student => ({ kelas: student.kelas - 1 }));
        toast({ title: 'Berhasil!', description: `${selectedStudents.length} siswa telah diturunkan kelas.` });
      }
    );
  };
  
  const handleGraduate = () => {
    if (currentKelasForSelection === 'mixed' || typeof currentKelasForSelection !== 'number' || currentKelasForSelection !== 6) return;
    const studentNames = getSelectedStudentsDetails().map(s => s.nama).join(', ');
    createAlert(
      'Luluskan Siswa',
      `Anda yakin ingin meluluskan ${selectedStudents.length} siswa (${studentNames})? Mereka akan dipindahkan ke data alumni.`,
      async () => {
        const year = new Date().getFullYear();
        await handleBatchUpdate(() => ({ status: 'Lulus', tahunLulus: year }));
        toast({ title: 'Berhasil!', description: `${selectedStudents.length} siswa telah diluluskan.` });
      }
    );
  };

  const handleOpenMoveClassDialog = () => {
    if (!isAdmin || areActionsDisabled) return;
    if (currentKelasForSelection === null || currentKelasForSelection === 'mixed') return;
    setTargetClass(String(currentKelasForSelection));
    setIsMoveClassDialogOpen(true);
  };
  
  const handleMoveClass = () => {
      const studentNames = getSelectedStudentsDetails().map(s => s.nama).join(', ');
      createAlert(
        'Pindahkan Kelas',
        `Anda yakin ingin memindahkan ${selectedStudents.length} siswa (${studentNames}) ke kelas ${targetClass}?`,
        async () => {
          await handleBatchUpdate(() => ({ kelas: Number(targetClass) }));
          setIsMoveClassDialogOpen(false);
          toast({ title: 'Berhasil!', description: `${selectedStudents.length} siswa telah dipindahkan.` });
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
    <div className="bg-background pb-32 md:pb-0">
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
                {isAdmin && (
                  <>
                    <Button onClick={handleOpenMoveClassDialog} size="sm" variant="outline" disabled={areActionsDisabled}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> Pindahkan
                    </Button>
                    <Button onClick={handlePromote} size="sm" variant="outline" disabled={areActionsDisabled || currentKelas === 6}>
                        <ArrowUp className="mr-2 h-4 w-4" /> Naik Kelas
                    </Button>
                    <Button onClick={handleDemote} size="sm" variant="outline" disabled={areActionsDisabled || currentKelas === 0}>
                        <ArrowDown className="mr-2 h-4 w-4" /> Turun Kelas
                    </Button>
                    <Button onClick={handleGraduate} size="sm" variant="destructive" disabled={areActionsDisabled || currentKelas !== 6}>
                        <GraduationCap className="mr-2 h-4 w-4" /> Luluskan
                    </Button>
                  </>
                )}
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
                    checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    disabled={filteredStudents.length === 0 || !isAdmin}
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
              {isLoading && <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>}
              {filteredStudents.map((student) => (
                <TableRow key={student.nis} data-state={selectedStudents.includes(student.nis) ? "selected" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(student.nis)}
                      onCheckedChange={(checked) => handleSelectStudent(student.nis, Boolean(checked))}
                      disabled={!isAdmin}
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
      
      {isAdmin && (
        <>
          <Dialog open={isMoveClassDialogOpen} onOpenChange={setIsMoveClassDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Pindahkan Siswa ke Kelas Lain</DialogTitle>
                <DialogDescription>
                  Pilih kelas tujuan untuk {selectedStudents.length} siswa yang dipilih.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <Label htmlFor="kelas">Pilih Kelas Tujuan</Label>
                  <Select value={targetClass} onValueChange={setTargetClass}>
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
                <Button type="button" variant="secondary" onClick={() => setIsMoveClassDialogOpen(false)}>Batal</Button>
                <Button type="submit" onClick={handleMoveClass}>Pindahkan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
        </>
      )}
    </div>
  );
}
    
