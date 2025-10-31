
'use client';

import React, { useState } from 'react';
import JadwalPelajaran from './JadwalPelajaran';
import JadwalUjian from './JadwalUjian';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function JadwalPage() {
  return (
    <div className="bg-background pb-32 md:pb-0">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Manajemen Jadwal
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Kelola jadwal pelajaran reguler dan jadwal ujian untuk setiap kelas.
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="pelajaran" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pelajaran">Jadwal Pelajaran</TabsTrigger>
            <TabsTrigger value="ujian">Jadwal Ujian</TabsTrigger>
          </TabsList>
          <TabsContent value="pelajaran" className="mt-6">
             <JadwalPelajaran />
          </TabsContent>
          <TabsContent value="ujian" className="mt-6">
            <JadwalUjian />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
