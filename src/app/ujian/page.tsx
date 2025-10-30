
'use client';

import React from 'react';
import JadwalUjian from './JadwalUjian';

export default function UjianPage() {
  return (
    <div className="bg-background pb-32 md:pb-0">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Manajemen Jadwal Ujian
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola jadwal ujian untuk setiap kelas.
            </p>
          </div>
        </div>

        <JadwalUjian />

      </div>
    </div>
  );
}
