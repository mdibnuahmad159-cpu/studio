
'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Raport, Siswa as DetailedStudent } from '@/lib/data';
import { Upload, Download, Eye, Search, X, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function RaportPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const { user } = useUser();
  
  const siswaAktifQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'siswa'), where('status', '==', 'Aktif'));
  }, [firestore, user]);
  const { data: activeStudents, isLoading: studentsLoading } = useCollection<DetailedStudent>(siswaAktifQuery);
  
  const raportsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, 'raports');
  }, [firestore, user]);
  const { data: raports, isLoading: raportsLoading } = useCollection<Raport>(raportsQuery);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{nis: string, raportKey: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<DetailedStudent | null>(null);
  const [raportToDelete, setRaportToDelete] = useState<{ nis: string; raportKey: string; studentName: string; semesterLabel: string; } | null>(null);


  const raportsMap = useMemo(() => {
    return new Map(raports?.map(r => [r.nis, r]));
  }, [raports]);

  const filteredStudents = useMemo(() => {
    if (!activeStudents) return [];
    let sorted = [...activeStudents].sort((a,b) => a.nama.localeCompare(b.nama));
    if (!searchQuery) return sorted;
    
    return sorted.filter(student => 
        student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
        student.nis.includes(searchQuery)
    );
  }, [activeStudents, searchQuery]);

  const handleUploadClick = (nis: string, raportKey: string) => {
    if (!isAdmin) return;
    setUploadTarget({nis, raportKey});
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && uploadTarget && firestore) {
      const { nis, raportKey } = uploadTarget;
      
      toast({
        title: 'Mengunggah file...',
        description: `Harap tunggu, file ${file.name} sedang diunggah.`,
      });

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const fileUrl = reader.result as string;
        
        const raportDocRef = doc(firestore, 'raports', nis);
        const updateData = { [`raports.${raportKey}`]: fileUrl };
        
        updateDocumentNonBlocking(raportDocRef, updateData);

        toast({
          title: 'Upload Berhasil!',
          description: `Raport untuk siswa NIS ${nis} telah diunggah.`,
        });

        // Reset after upload
        setUploadTarget(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = (error) => {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Upload Gagal!',
          description: 'Terjadi kesalahan saat membaca file. Silakan coba lagi.',
        });
        setUploadTarget(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const getRaportFile = (nis: string, raportKey: string): string | null => {
    const studentRaport = raportsMap.get(nis);
    // @ts-ignore
    return studentRaport?.raports[raportKey] || null;
  };
  
  const handleDeleteClick = (nis: string, raportKey: string, studentName: string, semesterLabel: string) => {
    setRaportToDelete({ nis, raportKey, studentName, semesterLabel });
  };

  const confirmDelete = () => {
    if (raportToDelete && firestore) {
      const { nis, raportKey } = raportToDelete;
      const raportDocRef = doc(firestore, 'raports', nis);
      const updateData = { [`raports.${raportKey}`]: null };
      
      updateDocumentNonBlocking(raportDocRef, updateData);

      toast({
        title: 'Hapus Berhasil!',
        description: 'File raport telah dihapus.',
      });
      setRaportToDelete(null);
    }
  };

  const renderSemesterActions = (student: DetailedStudent, kelas: string, semester: 'ganjil' | 'genap') => {
    const raportKey = `kelas_${kelas}_${semester}`;
    const raportFile = getRaportFile(student.nis, raportKey);
    const semesterLabel = semester === 'ganjil' ? 'Ganjil' : 'Genap';
    
    return (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <p className="font-medium">Semester {semesterLabel}</p>
            <div className="flex gap-2">
                {raportFile ? (
                    <>
                        <Button asChild size="sm" variant="outline">
                            <a href={raportFile} target="_blank" rel="noopener noreferrer">
                                <Eye className="mr-2 h-4 w-4" /> Lihat
                            </a>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <a href={raportFile} download={`Raport_${student.nama}_K${kelas}_${semesterLabel}.pdf`}>
                                <Download className="mr-2 h-4 w-4" /> Unduh
                            </a>
                        </Button>
                         {isAdmin && (
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteClick(student.nis, raportKey, student.nama, semesterLabel)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </Button>
                        )}
                    </>
                ) : (
                    <span className="text-sm text-muted-foreground">Belum diunggah</span>
                )}
                {isAdmin && (
                    <Button size="sm" variant="secondary" onClick={() => handleUploadClick(student.nis, raportKey)}>
                        <Upload className="mr-2 h-4 w-4" /> {raportFile ? 'Ganti' : 'Unggah'}
                    </Button>
                )}
            </div>
        </div>
    );
  };

  const isLoading = studentsLoading || raportsLoading;

  return (
    <div className="bg-background pb-32 md:pb-0">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Manajemen Raport Siswa
            </h1>
            <p className="mt-4 max-w-4xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Pilih siswa untuk mengelola file raport per semester.
            </p>
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

        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          disabled={!isAdmin}
        />

        {isLoading && <p className="text-center">Memuat data siswa...</p>}
        
        <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.05 } },
                hidden: {},
            }}
        >
          {filteredStudents?.map((student) => (
            <motion.div
                key={student.nis}
                variants={{
                    visible: { opacity: 1, y: 0 },
                    hidden: { opacity: 0, y: 20 },
                }}
            >
                <Card 
                    className="h-full cursor-pointer hover:shadow-lg hover:border-primary transition-all"
                    onClick={() => setSelectedStudent(student)}
                >
                <CardHeader>
                    <CardTitle className="truncate">{student.nama}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">NIS: {student.nis}</p>
                    <p className="text-sm text-muted-foreground">Kelas: {student.kelas}</p>
                </CardContent>
                </Card>
            </motion.div>
          ))}
        </motion.div>

        {selectedStudent && (
             <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="max-w-3xl h-auto max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-headline">Raport: {selectedStudent.nama}</DialogTitle>
                        <DialogDescription>NIS: {selectedStudent.nis}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-hidden">
                        <Tabs defaultValue="0" className="flex flex-col h-full">
                            <TabsList className="grid w-full grid-cols-7">
                                {KELAS_OPTIONS.map(kelas => (
                                    <TabsTrigger key={kelas} value={kelas}>Kls {kelas}</TabsTrigger>
                                ))}
                            </TabsList>
                            <div className="flex-grow overflow-y-auto mt-4 pr-2">
                                {KELAS_OPTIONS.map(kelas => (
                                <TabsContent key={kelas} value={kelas}>
                                    <div className="space-y-4">
                                        {renderSemesterActions(selectedStudent, kelas, 'ganjil')}
                                        {renderSemesterActions(selectedStudent, kelas, 'genap')}
                                    </div>
                                </TabsContent>
                                ))}
                            </div>
                        </Tabs>
                    </div>
                </DialogContent>
            </Dialog>
        )}
        
        {raportToDelete && (
          <AlertDialog open={!!raportToDelete} onOpenChange={() => setRaportToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Anda Yakin?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini akan menghapus file raport Semester {raportToDelete.semesterLabel} untuk siswa <span className="font-bold">{raportToDelete.studentName}</span>. Aksi ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </div>
    </div>
  );
}
