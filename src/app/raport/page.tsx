
'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Raport, Siswa as DetailedStudent } from '@/lib/data';
import { Upload, Download, MoreHorizontal, Eye, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useUser, useStorage } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useAdmin } from '@/context/AdminProvider';
import { Input } from '@/components/ui/input';
import { uploadFile } from '@/lib/storage';

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function RaportPage() {
  const firestore = useFirestore();
  const storage = useStorage();
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
    if (file && uploadTarget && firestore && storage) {
      const { nis, raportKey } = uploadTarget;
      
      toast({
        title: 'Mengunggah file...',
        description: `Harap tunggu, file ${file.name} sedang diunggah.`,
      });

      try {
        const filePath = `raports/${nis}/${raportKey}_${file.name}`;
        const fileUrl = await uploadFile(storage, filePath, file);
        
        const raportDocRef = doc(firestore, 'raports', nis);
        const updateData = { [`raports.${raportKey}`]: fileUrl };
        
        updateDocumentNonBlocking(raportDocRef, updateData);

        toast({
          title: 'Upload Berhasil!',
          description: `Raport untuk siswa NIS ${nis} telah diunggah.`,
        });
      } catch (error) {
        console.error(error);
        toast({
          variant: 'destructive',
          title: 'Upload Gagal!',
          description: 'Terjadi kesalahan saat mengunggah file. Silakan coba lagi.',
        });
      } finally {
        // Reset after upload
        setUploadTarget(null);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const getRaportFile = (nis: string, raportKey: string): string | null => {
    const studentRaport = raports?.find(r => r.nis === nis);
    // @ts-ignore
    return studentRaport?.raports[raportKey] || null;
  };

  const renderRaportCell = (student: DetailedStudent, kelas: string, semester: 'ganjil' | 'genap') => {
      const raportKey = `kelas_${kelas}_${semester}`;
      const raportFile = getRaportFile(student.nis, raportKey);
      const semesterLabel = semester === 'ganjil' ? 'Ganjil' : 'Genap';

      if (raportFile) {
          return (
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                          File <MoreHorizontal className="ml-2 h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                       <DropdownMenuItem asChild>
                          <a href={raportFile} target="_blank" rel="noopener noreferrer">
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Lihat</span>
                          </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                          <a href={raportFile} download={`Raport_${student.nama}_K${kelas}_${semesterLabel}.pdf`}>
                              <Download className="mr-2 h-4 w-4" />
                              <span>Unduh</span>
                          </a>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => handleUploadClick(student.nis, raportKey)}>
                            <Upload className="mr-2 h-4 w-4" />
                            <span>Ganti File</span>
                        </DropdownMenuItem>
                      )}
                  </DropdownMenuContent>
              </DropdownMenu>
          );
      }

      if (isAdmin) {
        return (
            <Button variant="outline" size="sm" onClick={() => handleUploadClick(student.nis, raportKey)}>
                <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
        );
      }

      return <span className="text-xs text-muted-foreground">-</span>;
  };

  const isLoading = studentsLoading || raportsLoading;

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Manajemen Raport Siswa
            </h1>
            <p className="mt-4 max-w-4xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Unggah dan kelola file raport siswa untuk setiap semester.
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

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="relative w-full overflow-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline sticky left-0 bg-card z-10 w-[200px]">Nama</TableHead>
                  <TableHead className="font-headline w-[120px]">NIS</TableHead>
                  {KELAS_OPTIONS.map(kelas => (
                    <TableHead key={kelas} className="font-headline text-center" colSpan={2}>
                      Kelas {kelas}
                    </TableHead>
                  ))}
                </TableRow>
                 <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 w-[200px]"></TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                   {KELAS_OPTIONS.map(kelas => (
                    <React.Fragment key={`subheader-${kelas}`}>
                      <TableHead className="text-center font-medium">Ganjil</TableHead>
                      <TableHead className="text-center font-medium">Genap</TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={16} className="text-center">Loading...</TableCell></TableRow>}
                {filteredStudents?.map((student) => (
                  <TableRow key={student.nis}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10 w-[200px]">{student.nama}</TableCell>
                    <TableCell>{student.nis}</TableCell>
                    {KELAS_OPTIONS.map(kelas => (
                        <React.Fragment key={`${student.nis}-${kelas}`}>
                          <TableCell className="text-center">
                            {renderRaportCell(student, kelas, 'ganjil')}
                          </TableCell>
                          <TableCell className="text-center">
                            {renderRaportCell(student, kelas, 'genap')}
                          </TableCell>
                        </React.Fragment>
                      )
                    )}
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
