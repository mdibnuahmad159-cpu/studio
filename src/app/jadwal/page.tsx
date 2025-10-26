
'use client';

import { useState, useMemo } from 'react';
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
import { FileDown, PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { jadwalPelajaran as initialJadwal, teachers, kitabPelajaran } from '@/lib/data';
import type { Jadwal, Teacher } from '@/lib/data';
import { cn } from '@/lib/utils';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function JadwalPage() {
  const [jadwal, setJadwal] = useState<Jadwal[]>(initialJadwal);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newJadwal, setNewJadwal] = useState<Omit<Jadwal, 'id'>>({
    hari: 'Senin',
    kelas: '10',
    mataPelajaran: '',
    guruId: 0,
    jam: '14:00 - 15:00',
  });
  const [selectedKelas, setSelectedKelas] = useState('all');
  const [selectedHari, setSelectedHari] = useState('all');
  const [selectedGuru, setSelectedGuru] = useState('all');

  const availableKelas = useMemo(() => {
     const kelasSet = new Set(jadwal.map(j => j.kelas));
     return Array.from(kelasSet).sort((a,b) => a.localeCompare(b, undefined, {numeric: true}));
  }, [jadwal]);

  const availableHari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const availableJam = ['14:00 - 15:00', '15:30 - 16:30'];
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewJadwal(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewJadwal(prev => ({ ...prev, [name]: value }));
  };

  const handleAddJadwal = () => {
    if (newJadwal.kelas && newJadwal.mataPelajaran && newJadwal.guruId && newJadwal.jam) {
      const newEntry: Jadwal = {
        id: jadwal.length > 0 ? Math.max(...jadwal.map(j => j.id)) + 1 : 1,
        ...newJadwal,
        guruId: Number(newJadwal.guruId),
      };
      setJadwal(prev => [...prev, newEntry].sort((a, b) => availableHari.indexOf(a.hari) - availableHari.indexOf(b.hari) || a.jam.localeCompare(b.jam)));
      setNewJadwal({ hari: 'Senin', kelas: '10', mataPelajaran: '', guruId: 0, jam: '14:00 - 15:00' });
      setIsDialogOpen(false);
    }
  };

  const getTeacherName = (guruId: number) => {
    const teacher = teachers.find(t => t.id === guruId);
    return teacher ? teacher.name : 'N/A';
  };

  const filteredJadwal = useMemo(() => {
    let filtered = [...jadwal];
    if (selectedKelas !== 'all') {
      filtered = filtered.filter(item => item.kelas === selectedKelas);
    }
    if (selectedHari !== 'all') {
      filtered = filtered.filter(item => item.hari === selectedHari);
    }
    if (selectedGuru !== 'all') {
        filtered = filtered.filter(item => String(item.guruId) === selectedGuru);
    }
    return filtered.sort((a, b) => availableHari.indexOf(a.hari) - availableHari.indexOf(b.hari) || a.jam.localeCompare(b.jam));
  }, [jadwal, selectedKelas, selectedHari, selectedGuru]);

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Jadwal Pelajaran', 20, 10);
    doc.autoTable({
      head: [['Hari', 'Kelas', 'Mata Pelajaran', 'Guru', 'Jam']],
      body: filteredJadwal.map((item: Jadwal) => [
        item.hari,
        `Kelas ${item.kelas}`,
        item.mataPelajaran,
        getTeacherName(item.guruId),
        item.jam,
      ]),
    });
    doc.save('jadwal-pelajaran.pdf');
  };

  let lastDay: string | null = null;

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Jadwal Pelajaran
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Lihat dan kelola jadwal pelajaran untuk semua kelas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:brightness-110">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Jadwal
            </Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row justify-end gap-4">
            <Select value={selectedHari} onValueChange={setSelectedHari}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Hari" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Hari</SelectItem>
                    {availableHari.map(hari => (
                        <SelectItem key={hari} value={hari}>{hari}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {availableKelas.map(kelas => (
                        <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedGuru} onValueChange={setSelectedGuru}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter Guru" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Guru</SelectItem>
                    {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={String(teacher.id)}>{teacher.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>


        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-headline">Hari</TableHead>
                <TableHead className="font-headline">Kelas</TableHead>
                <TableHead className="font-headline">Mata Pelajaran</TableHead>
                <TableHead className="font-headline">Guru</TableHead>
                <TableHead className="font-headline">Jam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJadwal.map((item, index) => {
                 const showDaySeparator = item.hari !== lastDay;
                 lastDay = item.hari;
                 return (
                    <TableRow key={index} className={cn(showDaySeparator && index > 0 && 'border-t-4 border-primary/20')}>
                        <TableCell className="font-medium">{item.hari}</TableCell>
                        <TableCell>Kelas {item.kelas}</TableCell>
                        <TableCell>{item.mataPelajaran}</TableCell>
                        <TableCell>{getTeacherName(item.guruId)}</TableCell>
                        <TableCell>{item.jam}</TableCell>
                    </TableRow>
                 )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Jadwal Baru</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah untuk menambahkan jadwal baru.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hari" className="text-right">Hari</Label>
              <Select name="hari" onValueChange={(value) => handleSelectChange('hari', value)} value={newJadwal.hari}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Hari" />
                </SelectTrigger>
                <SelectContent>
                   {availableHari.map(hari => (
                        <SelectItem key={hari} value={hari}>{hari}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kelas" className="text-right">Kelas</Label>
              <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={newJadwal.kelas}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                   {availableKelas.map(kelas => (
                        <SelectItem key={kelas} value={kelas}>Kelas {kelas}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mataPelajaran" className="text-right">Mata Pelajaran</Label>
              <Select name="mataPelajaran" onValueChange={(value) => handleSelectChange('mataPelajaran', value)} value={newJadwal.mataPelajaran}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Mata Pelajaran" />
                </SelectTrigger>
                <SelectContent>
                   {kitabPelajaran.map((mapel, i) => (
                        <SelectItem key={`${mapel.kitab}-${i}`} value={mapel.mataPelajaran}>{mapel.mataPelajaran} ({mapel.kitab})</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="guruId" className="text-right">Guru</Label>
              <Select name="guruId" onValueChange={(value) => handleSelectChange('guruId', value)} value={String(newJadwal.guruId)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Guru" />
                </SelectTrigger>
                <SelectContent>
                   {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={String(teacher.id)}>{teacher.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jam" className="text-right">Jam</Label>
               <Select name="jam" onValueChange={(value) => handleSelectChange('jam', value)} value={newJadwal.jam}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Jam" />
                </SelectTrigger>
                <SelectContent>
                   {availableJam.map(jam => (
                        <SelectItem key={jam} value={jam}>{jam}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button type="submit" onClick={handleAddJadwal} className="bg-gradient-primary text-primary-foreground hover:brightness-110">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    