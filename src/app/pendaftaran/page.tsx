
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Siswa } from '@/lib/data';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';

const initialFormState = {
    nis: '',
    fullName: '',
    nickname: '',
    birthPlace: '',
    birthDate: undefined as Date | undefined,
    gender: 'Laki-laki',
    religion: 'Islam',
    address: '',
    fatherName: '',
    motherName: '',
    fatherOccupation: '',
    motherOccupation: '',
    phone: '',
    email: '',
    previousSchool: '',
    targetLevel: 'Tingkat Dasar (Kelas 1-6)',
};

export default function PendaftaranPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialFormState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };
  
  const handleDateChange = (date: Date | undefined) => {
    setFormData({ ...formData, birthDate: date });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Koneksi Gagal!",
        description: "Tidak dapat terhubung ke database.",
      });
      return;
    }

    if (!formData.nis || !formData.fullName) {
      toast({
        variant: "destructive",
        title: "Gagal!",
        description: "NIS dan Nama Lengkap wajib diisi.",
      });
      return;
    }

    const studentData: Omit<Siswa, 'id'> = {
        nis: formData.nis,
        nama: formData.fullName,
        jenisKelamin: formData.gender as 'Laki-laki' | 'Perempuan',
        tempatLahir: formData.birthPlace,
        tanggalLahir: formData.birthDate ? format(formData.birthDate, "dd-MM-yyyy") : '',
        namaAyah: formData.fatherName,
        namaIbu: formData.motherName,
        alamat: formData.address,
        fileDokumen: '/path/to/default.pdf', // Placeholder
        status: 'Aktif',
        kelas: 0, // Default to class 0
    };

    // Use NIS as the document ID for both siswa and raports collections
    const studentDocRef = doc(firestore, 'siswa', formData.nis);
    setDocumentNonBlocking(studentDocRef, studentData, { merge: false });

    const raportDocRef = doc(firestore, 'raports', formData.nis);
    const newRaport = {
      nis: formData.nis,
      raports: {
        kelas_0_ganjil: null, kelas_0_genap: null,
        kelas_1_ganjil: null, kelas_1_genap: null,
        kelas_2_ganjil: null, kelas_2_genap: null,
        kelas_3_ganjil: null, kelas_3_genap: null,
        kelas_4_ganjil: null, kelas_4_genap: null,
        kelas_5_ganjil: null, kelas_5_genap: null,
        kelas_6_ganjil: null, kelas_6_genap: null,
      }
    };
    setDocumentNonBlocking(raportDocRef, newRaport, { merge: false });


    toast({
        title: "Pendaftaran Berhasil!",
        description: `Terima kasih, ${formData.fullName}. Data Anda telah kami terima.`,
    });
    
    // Reset form
    setFormData(initialFormState);
  };

  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <Card className="max-w-4xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-3xl md:text-4xl text-primary">Formulir Pendaftaran Siswa Baru</CardTitle>
            <CardDescription className="text-lg">Silakan isi data di bawah ini dengan lengkap dan benar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                 <h3 className="font-headline text-xl font-semibold border-b pb-2">Data Calon Siswa</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nis">NIS (Nomor Induk Siswa)</Label>
                        <Input id="nis" name="nis" value={formData.nis} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nama Lengkap</Label>
                        <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="nickname">Nama Panggilan</Label>
                        <Input id="nickname" name="nickname" value={formData.nickname} onChange={handleChange} required />
                    </div>
                     <div className="space-y-2">
                        <Label>Jenis Kelamin</Label>
                        <RadioGroup name="gender" onValueChange={(value) => handleSelectChange('gender', value)} value={formData.gender} className="flex items-center space-x-4 pt-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Laki-laki" id="male" />
                                <Label htmlFor="male">Laki-laki</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Perempuan" id="female" />
                                <Label htmlFor="female">Perempuan</Label>
                            </div>
                        </RadioGroup>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="birthPlace">Tempat Lahir</Label>
                        <Input id="birthPlace" name="birthPlace" value={formData.birthPlace} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="birthDate">Tanggal Lahir</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.birthDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.birthDate ? format(formData.birthDate, "PPP") : <span>Pilih tanggal</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.birthDate}
                              onSelect={handleDateChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="religion">Agama</Label>
                        <Select name="religion" onValueChange={(value) => handleSelectChange('religion', value)} value={formData.religion}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Agama" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Islam">Islam</SelectItem>
                            <SelectItem value="Kristen">Kristen</SelectItem>
                            <SelectItem value="Katolik">Katolik</SelectItem>
                            <SelectItem value="Hindu">Hindu</SelectItem>
                            <SelectItem value="Buddha">Buddha</SelectItem>
                            <SelectItem value="Konghucu">Konghucu</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="address">Alamat Lengkap</Label>
                        <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
                     </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="font-headline text-xl font-semibold border-b pb-2">Data Orang Tua/Wali</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fatherName">Nama Ayah</Label>
                        <Input id="fatherName" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="motherName">Nama Ibu</Label>
                        <Input id="motherName" name="motherName" value={formData.motherName} onChange={handleChange} required />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fatherOccupation">Pekerjaan Ayah</Label>
                        <Input id="fatherOccupation" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="motherOccupation">Pekerjaan Ibu</Label>
                        <Input id="motherOccupation" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} required />
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h3 className="font-headline text-xl font-semibold border-b pb-2">Kontak & Pendidikan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="phone">No. Telepon Aktif</Label>
                          <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="email">Alamat Email</Label>
                          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                      </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="previousSchool">Asal Sekolah</Label>
                          <Input id="previousSchool" name="previousSchool" value={formData.previousSchool} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="targetLevel">Jenjang yang Dituju</Label>
                          <Select name="targetLevel" onValueChange={(value) => handleSelectChange('targetLevel', value)} value={formData.targetLevel}>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih Jenjang" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Tingkat Dasar (Kelas 1-6)">Tingkat Dasar (Kelas 1-6)</SelectItem>
                              <SelectItem value="Tingkat Menengah (Kelas 7-9)">Tingkat Menengah (Kelas 7-9)</SelectItem>
                              <SelectItem value="Tingkat Atas (Kelas 10-12)">Tingkat Atas (Kelas 10-12)</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>
                  </div>
              </div>

              <div className="text-center pt-4">
                <Button type="submit" size="lg">
                  Daftar Sekarang
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
