
export type Teacher = {
  id: number;
  name: string;
  position: string;
  whatsapp: string;
  imageId: string | null;
};

export const teachers: Teacher[] = [
  {
    id: 1,
    name: 'Budi Santoso, M.Pd.',
    position: 'Kepala Sekolah, Matematika',
    whatsapp: '6281234567890',
    imageId: 'teacher-male-1'
  },
  {
    id: 2,
    name: 'Citra Lestari, S.S.',
    position: 'Guru Bahasa Inggris',
    whatsapp: '6281234567891',
    imageId: 'teacher-female-1'
  },
  {
    id: 3,
    name: 'Agus Wijaya, S.Kom.',
    position: 'Guru Teknologi Informasi',
    whatsapp: '6281234567892',
    imageId: 'teacher-male-2'
  },
  {
    id: 4,
    name: 'Dewi Anjani, S.Si.',
    position: 'Guru Sains (Fisika, Kimia)',
    whatsapp: '6281234567893',
    imageId: 'teacher-female-2'
  },
  {
    id: 5,
    name: 'Eko Prasetyo, S.Pd.',
    position: 'Guru Pendidikan Jasmani',
    whatsapp: '6281234567894',
    imageId: 'teacher-male-3'
  },
  {
    id: 6,
    name: 'Fitriani, S.Sn.',
    position: 'Guru Seni Budaya',
    whatsapp: '6281234567895',
    imageId: 'teacher-female-3'
  },
];

export const students = [
  { id: 'VS-001', name: 'Ahmad Abdullah', grade: '12 IPA 1' },
  { id: 'VS-002', name: 'Bella Christina', grade: '12 IPS 2' },
  { id: 'VS-003', name: 'Charlie Darmawan', grade: '11 IPA 1' },
  { id: 'VS-004', name: 'Diana Puspita', grade: '11 IPS 3' },
  { id: 'VS-005', name: 'Fahri Hidayat', grade: '10-A' },
  { id: 'VS-006', name: 'Gita Amelia', grade: '10-B' },
  { id: 'VS-007', name: 'Hasan Basri', grade: '12 IPA 2' },
  { id: 'VS-008', name: 'Indah Permata', grade: '11 IPS 1' },
  { id: 'VS-009', name: 'Joko Susilo', grade: '10-C' },
  { id: 'VS-010', name: 'Kartika Sari', grade: '12 IPS 1' },
  { id: 'VS-011', name: 'Lina Marlina', grade: '10-A' },
  { id: 'VS-012', name: 'Muhammad Rafi', grade: '11 IPA 2' },
  { id: 'VS-013', name: 'Nadia Putri', grade: '12 IPS 1' },
  { id: 'VS-014', name: 'Oscar Wijaya', grade: '10-B' },
  { id: 'VS-015', name: 'Putri Ayu', grade: '11 IPS 2' },
];

export type DetailedStudent = {
  nama: string;
  nis: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string;
  namaAyah: string;
  namaIbu: string;
  alamat: string;
  fileDokumen: string;
  kelas: number;
  status: 'Aktif' | 'Lulus' | 'Pindah';
  tahunLulus?: number;
};

export const detailedStudents: DetailedStudent[] = [
  {
    nama: 'Ahmad Abdullah',
    nis: '2024001',
    jenisKelamin: 'Laki-laki',
    tempatLahir: 'Jakarta',
    tanggalLahir: '15-05-2008',
    namaAyah: 'Bambang',
    namaIbu: 'Sri',
    alamat: 'Jl. Merdeka No. 1, Jakarta',
    fileDokumen: '/path/to/doc1.pdf',
    kelas: 6,
    status: 'Aktif',
  },
  {
    nama: 'Bella Christina',
    nis: '2024002',
    jenisKelamin: 'Perempuan',
    tempatLahir: 'Surabaya',
    tanggalLahir: '22-08-2008',
    namaAyah: 'Charles',
    namaIbu: 'Maria',
    alamat: 'Jl. Pahlawan No. 10, Surabaya',
    fileDokumen: '/path/to/doc2.pdf',
    kelas: 5,
    status: 'Aktif',
  },
  {
    nama: 'Charlie Darmawan',
    nis: '2024003',
    jenisKelamin: 'Laki-laki',
    tempatLahir: 'Bandung',
    tanggalLahir: '01-12-2009',
    namaAyah: 'Darmawan',
    namaIbu: 'Eka',
    alamat: 'Jl. Asia Afrika No. 30, Bandung',
    fileDokumen: '/path/to/doc3.pdf',
    kelas: 4,
    status: 'Aktif',
  },
  {
    nama: 'Diana Puspita',
    nis: '2024004',
    jenisKelamin: 'Perempuan',
    tempatLahir: 'Medan',
    tanggalLahir: '19-03-2009',
    namaAyah: 'Franky',
    namaIbu: 'Grace',
    alamat: 'Jl. Gatot Subroto No. 5, Medan',
    fileDokumen: '/path/to/doc4.pdf',
    kelas: 3,
    status: 'Aktif',
  },
    {
    nama: 'Gita Amelia',
    nis: '2024006',
    jenisKelamin: 'Perempuan',
    tempatLahir: 'Semarang',
    tanggalLahir: '11-11-2011',
    namaAyah: 'Hartono',
    namaIbu: 'Indah',
    alamat: 'Jl. Pandanaran No. 50, Semarang',
    fileDokumen: '/path/to/doc6.pdf',
    kelas: 1,
    status: 'Aktif',
  },
  {
    nama: 'Fahri Hidayat',
    nis: '2024005',
    jenisKelamin: 'Laki-laki',
    tempatLahir: 'Yogyakarta',
    tanggalLahir: '30-07-2010',
    namaAyah: 'Iqbal',
    namaIbu: 'Jasmine',
    alamat: 'Jl. Malioboro No. 12, Yogyakarta',
    fileDokumen: '/path/to/doc5.pdf',
    kelas: 2,
    status: 'Aktif',
  },
    {
    nama: 'Elang Perkasa',
    nis: '2024007',
    jenisKelamin: 'Laki-laki',
    tempatLahir: 'Makassar',
    tanggalLahir: '05-01-2012',
    namaAyah: 'Joko',
    namaIbu: 'Kartini',
    alamat: 'Jl. Sultan Hasanuddin No. 8, Makassar',
    fileDokumen: '/path/to/doc7.pdf',
    kelas: 0,
    status: 'Aktif',
  },
];

export const alumni: DetailedStudent[] = [
    {
        nama: 'Zahra Al-Fath',
        nis: '2018001',
        jenisKelamin: 'Perempuan',
        tempatLahir: 'Jakarta',
        tanggalLahir: '10-02-2002',
        namaAyah: 'Fathurrahman',
        namaIbu: 'Aisyah',
        alamat: 'Jl. Kenangan No. 10, Jakarta',
        fileDokumen: '/path/to/doc_alumni1.pdf',
        kelas: 6,
        status: 'Lulus',
        tahunLulus: 2023
    },
    {
        nama: 'Yusuf Ibrahim',
        nis: '2018002',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Bandung',
        tanggalLahir: '25-09-2002',
        namaAyah: 'Ibrahim',
        namaIbu: 'Halimah',
        alamat: 'Jl. Cihampelas No. 20, Bandung',
        fileDokumen: '/path/to/doc_alumni2.pdf',
        kelas: 6,
        status: 'Lulus',
        tahunLulus: 2023
    },
    {
        nama: 'Xavier Ferdinand',
        nis: '2017001',
        jenisKelamin: 'Laki-laki',
        tempatLahir: 'Surabaya',
        tanggalLahir: '12-06-2001',
        namaAyah: 'Ferdinand',
        namaIbu: 'Gabriella',
        alamat: 'Jl. Darmo No. 30, Surabaya',
        fileDokumen: '/path/to/doc_alumni3.pdf',
        kelas: 6,
        status: 'Lulus',
        tahunLulus: 2022
    }
];


export const kitabPelajaran = [
  { kelas: '10', mataPelajaran: 'Fiqih', kitab: 'Fathul Qorib' },
  { kelas: '10', mataPelajaran: 'Hadits', kitab: 'Arbain Nawawi' },
  { kelas: '10', mataPelajaran: 'Akhlak', kitab: 'Taisirul Khallaq' },
  { kelas: '11', mataPelajaran: 'Fiqih', kitab: 'Fathul Mu\'in' },
  { kelas: '11', mataPelajaran: 'Hadits', kitab: 'Riyadhus Shalihin' },
  { kelas: '11', mataPelajaran: 'Tasawuf', kitab: 'Al-Hikam' },
  { kelas: '12', mataPelajaran: 'Ushul Fiqih', kitab: 'Al-Waraqat' },
  { kelas: '12', mataPelajaran: 'Tafsir', kitab: 'Tafsir Jalalain' },
  { kelas: '12', mataPelajaran: 'Balaghah', kitab: 'Jauharul Maknun' },
];

export type Jadwal = {
  id: number;
  hari: string;
  kelas: string;
  mataPelajaran: string;
  guruId: number;
  jam: string;
};

export const jadwalPelajaran: Jadwal[] = [
    { id: 1, hari: 'Senin', kelas: '10', mataPelajaran: 'Fiqih', guruId: 1, jam: '07:00 - 08:30' },
    { id: 2, hari: 'Senin', kelas: '11', mataPelajaran: 'Fiqih', guruId: 1, jam: '09:00 - 10:30' },
    { id: 3, hari: 'Selasa', kelas: '10', mataPelajaran: 'Hadits', guruId: 2, jam: '07:00 - 08:30' },
    { id: 4, hari: 'Rabu', kelas: '12', mataPelajaran: 'Tafsir', guruId: 3, jam: '09:00 - 10:30' },
];
