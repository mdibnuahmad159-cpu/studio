
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  detailedStudents as initialStudents,
  initialRaports,
  StudentRaport,
  DetailedStudent,
} from '@/lib/data';
import { Upload, Download, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// This is a mock in-memory store to sync data across pages.
let dataStore = {
  students: initialStudents,
  raports: initialRaports,
};

const KELAS_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'];

export default function RaportPage() {
  const [students, setStudents] = useState<DetailedStudent[]>(dataStore.students);
  const [raports, setRaports] = useState<StudentRaport[]>(dataStore.raports);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [uploadTarget, setUploadTarget] = useState<{nis: string, raportKey: string} | null>(null);

  useEffect(() => {
    // Sync with dataStore on mount and handle new student additions
    const interval = setInterval(() => {
      const studentNises = students.map(s => s.nis);
      const raportNises = raports.map(r => r.nis);

      if (studentNises.length !== raportNises.length) {
         const newStudents = dataStore.students.filter(s => !raportNises.includes(s.nis));
         const newRaports: StudentRaport[] = newStudents.map(student => ({
          nis: student.nis,
          raports: {
            kelas_0_ganjil: null, kelas_0_genap: null,
            kelas_1_ganjil: null, kelas_1_genap: null,
            kelas_2_ganjil: null, kelas_2_genap: null,
            kelas_3_ganjil: null, kelas_3_genap: null,
            kelas_4_ganjil: null, kelas_4_genap: null,
            kelas_5_ganjil: null, kelas_5_genap: null,
            kelas_6_ganjil: null, kelas_6_genap: null,
          }
        }));

        if (newRaports.length > 0) {
            const updatedRaports = [...dataStore.raports, ...newRaports];
            dataStore.raports = updatedRaports;
            setRaports(updatedRaports);
        }
         setStudents(dataStore.students);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [students, raports]);

  const handleUploadClick = (nis: string, raportKey: string) => {
    setUploadTarget({nis, raportKey});
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && uploadTarget) {
      const { nis, raportKey } = uploadTarget;
      const fileUrl = URL.createObjectURL(file);
      
      const newRaports = raports.map(raport => {
        if (raport.nis === nis) {
          return {
            ...raport,
            raports: {
              ...raport.raports,
              [raportKey]: fileUrl,
            }
          }
        }
        return raport;
      });

      dataStore.raports = newRaports;
      setRaports(newRaports);

      toast({
        title: 'Upload Berhasil!',
        description: `Raport untuk siswa NIS ${nis} telah diunggah.`,
      });
      
      // Reset after upload
      setUploadTarget(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeStudents = students.filter(s => s.status === 'Aktif');

  const getRaportFile = (nis: string, raportKey: string): string | null => {
    const studentRaport = raports.find(r => r.nis === nis);
    return studentRaport?.raports[raportKey] || null;
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Manajemen Raport Siswa
            </h1>
            <p className="mt-4 max-w-4xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Unggah dan kelola file raport siswa untuk setiap semester.
            </p>
          </div>
        </div>

        <input
          type="file"
          accept=".pdf"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="relative w-full overflow-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-headline sticky left-0 bg-card z-10 w-[200px]">Nama</TableHead>
                  <TableHead className="font-headline sticky left-[200px] bg-card z-10 w-[120px]">NIS</TableHead>
                  {KELAS_OPTIONS.map(kelas => (
                    <TableHead key={kelas} className="font-headline text-center" colSpan={2}>
                      Kelas {kelas}
                    </TableHead>
                  ))}
                </TableRow>
                 <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 w-[200px]"></TableHead>
                  <TableHead className="sticky left-[200px] bg-card z-10 w-[120px]"></TableHead>
                   {KELAS_OPTIONS.map(kelas => (
                    <React.Fragment key={`subheader-${kelas}`}>
                      <TableHead className="text-center font-medium">Ganjil</TableHead>
                      <TableHead className="text-center font-medium">Genap</TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStudents.map((student) => (
                  <TableRow key={student.nis}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10 w-[200px]">{student.nama}</TableCell>
                    <TableCell className="sticky left-[200px] bg-card z-10 w-[120px]">{student.nis}</TableCell>
                    {KELAS_OPTIONS.map(kelas => {
                      const ganjilKey = `kelas_${kelas}_ganjil`;
                      const genapKey = `kelas_${kelas}_genap`;
                      const raportGanjil = getRaportFile(student.nis, ganjilKey);
                      const raportGenap = getRaportFile(student.nis, genapKey);

                      return (
                        <React.Fragment key={`${student.nis}-${kelas}`}>
                          <TableCell className="text-center">
                            {raportGanjil ? (
                              <Button variant="link" size="sm" asChild className="h-auto p-0 text-primary">
                                <a href={raportGanjil} download={`Raport_${student.nama}_K${kelas}_Ganjil.pdf`}>
                                  <Download className="mr-1 h-3 w-3"/>
                                  Lihat
                                </a>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleUploadClick(student.nis, ganjilKey)}>
                                <Upload className="mr-2 h-4 w-4" /> Upload
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {raportGenap ? (
                              <Button variant="link" size="sm" asChild className="h-auto p-0 text-primary">
                                <a href={raportGenap} download={`Raport_${student.nama}_K${kelas}_Genap.pdf`}>
                                  <Download className="mr-1 h-3 w-3" />
                                  Lihat
                                </a>
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleUploadClick(student.nis, genapKey)}>
                                <Upload className="mr-2 h-4 w-4" /> Upload
                              </Button>
                            )}
                          </TableCell>
                        </React.Fragment>
                      )
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

    