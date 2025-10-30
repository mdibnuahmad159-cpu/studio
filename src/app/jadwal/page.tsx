
'use client';

import React, { useState } from 'react';
import JadwalPelajaran from './JadwalPelajaran';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const KELAS_OPTIONS = ['all', '0', '1', '2', '3', '4', '5', '6'];

export default function JadwalPage() {
  const [selectedKelas, setSelectedKelas] = useState('all');

  return (
    <div className="bg-background pb-32 md:pb-0">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Manajemen Jadwal Pelajaran
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola jadwal pelajaran reguler untuk setiap kelas.
            </p>
          </div>
          <Select value={selectedKelas} onValueChange={setSelectedKelas}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
                {KELAS_OPTIONS.map(kelas => (
                    <SelectItem key={kelas} value={kelas}>
                        {kelas === 'all' ? 'Semua Kelas' : `Kelas ${kelas}`}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        
        <JadwalPelajaran selectedKelas={selectedKelas} />

      </div>
    </div>
  );
}
