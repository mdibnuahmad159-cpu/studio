
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
import { kitabPelajaran as initialKitabPelajaran } from '@/lib/data';
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

type Kitab = {
  kelas: string;
  mataPelajaran: string;
  kitab: string;
};

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function KurikulumPage() {
  const [kitabPelajaran, setKitabPelajaran] = useState<Kitab[]>(initialKitabPelajaran);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKurikulum, setNewKurikulum] = useState({ kelas: '', mataPelajaran: '', kitab: '' });
  const [selectedKelas, setSelectedKelas] = useState('all');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewKurikulum(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewKurikulum(prev => ({ ...prev, [name]: value }));
  };

  const handleAddKurikulum = () => {
    if (newKurikulum.kelas && newKurikulum.mataPelajaran && newKurikulum.kitab) {
      setKitabPelajaran(prev => [...prev, newKurikulum]);
      setNewKurikulum({ kelas: '', mataPelajaran: '', kitab: '' });
      setIsDialogOpen(false);
    }
  };

  const filteredKitabPelajaran = useMemo(() => {
    if (selectedKelas === 'all') {
      return kitabPelajaran;
    }
    return kitabPelajaran.filter(item => item.kelas === selectedKelas);
  }, [kitabPelajaran, selectedKelas]);

  const handleExportPdf = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    doc.text('Data Kurikulum', 20, 10);
    doc.autoTable({
      head: [['Kelas', 'Mata Pelajaran', 'Kitab']],
      body: filteredKitabPelajaran.map((item: Kitab) => [item.kelas, item.mataPelajaran, item.kitab]),
    });
    doc.save('data-kurikulum.pdf');
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Mata Pelajaran & Kitab
            </h1>
            <p className="mt-4 max-w-2xl mx-auto sm:mx-0 text-lg text-muted-foreground">
              Daftar kitab yang dipelajari dalam kurikulum kami untuk setiap
              jenjang kelas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto bg-gradient-primary text-primary-foreground hover:brightness-110">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah Kurikulum
            </Button>
            <Button onClick={handleExportPdf} variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Ekspor PDF
            </Button>
          </div>
        </div>

        <div className="mb-6 flex justify-end">
            <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Kelas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {[...Array(7)].map((_, i) => (
                        <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                    ))}
                    <SelectItem value="10">Kelas 10</SelectItem>
                    <SelectItem value="11">Kelas 11</SelectItem>
                    <SelectItem value="12">Kelas 12</SelectItem>
                </SelectContent>
            </Select>
        </div>


        <div className="border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] font-headline">Kelas</TableHead>
                <TableHead className="font-headline">Mata Pelajaran</TableHead>
                <TableHead className="font-headline">Kitab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKitabPelajaran.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.kelas}</TableCell>
                  <TableCell>{item.mataPelajaran}</TableCell>
                  <TableCell>{item.kitab}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Data Kurikulum</DialogTitle>
            <DialogDescription>
              Isi formulir di bawah ini untuk menambahkan data kurikulum baru.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kelas" className="text-right">
                Kelas
              </Label>
              <Select name="kelas" onValueChange={(value) => handleSelectChange('kelas', value)} value={newKurikulum.kelas}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(7)].map((_, i) => (
                      <SelectItem key={i} value={String(i)}>Kelas {i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mataPelajaran" className="text-right">
                Mata Pelajaran
              </Label>
              <Input id="mataPelajaran" name="mataPelajaran" value={newKurikulum.mataPelajaran} onChange={handleInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kitab" className="text-right">
                Kitab
              </Label>
              <Input id="kitab" name="kitab" value={newKurikulum.kitab} onChange={handleInputChange} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button type="submit" onClick={handleAddKurikulum} className="bg-gradient-primary text-primary-foreground hover:brightness-110">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    