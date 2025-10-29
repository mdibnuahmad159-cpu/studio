
// This file is no longer the primary source of truth.
// Data is now fetched from and managed in Firebase Firestore.
// The types are kept for reference and type safety in components.

export type Guru = {
  id: string; // Document ID from Firestore
  name: string;
  position: string;
  whatsapp: string;
  imageId: string | null;
};

export type Siswa = {
  id: string; // Document ID from Firestore (using nis)
  nama: string;
  nis: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string;
  namaAyah: string;
  namaIbu: string;
  alamat: string;
  fileDokumen: string;
  status: 'Aktif' | 'Lulus' | 'Pindah';
  kelas: number;
  tahunLulus?: number;
};

export type Kurikulum = {
  id: string; // Document ID from Firestore
  kode: string;
  kelas: string;
  mataPelajaran: string;
  kitab: string;
};

export type Jadwal = {
  id: string; // Document ID from Firestore
  hari: string;
  kelas: string;
  mataPelajaran: string;
  guruId: string; // Reference to Guru ID
  jam: string;
};

export type RaportFile = {
  [key: string]: string | null; // e.g., 'kelas_0_ganjil': 'gs://bucket/path/to/file.pdf'
};

export type Raport = {
  id: string; // Document ID from Firestore (using nis)
  nis: string;
  raports: RaportFile;
};

export type Nilai = {
    id: string; // Document ID from Firestore
    siswaId: string; // Reference to Siswa ID
    kurikulumId: string; // Reference to Kurikulum ID
    kelas: number;
    semester: 'ganjil' | 'genap';
    nilai: number;
};

export type NilaiSiswa = {
    id: string;
    siswaId: string;
    kelas: number;
    semester: 'ganjil' | 'genap';
    absensi?: 'sakit' | 'izin' | 'alpa' | null;
    keputusan?: 'lanjut semester genap' | 'naik kelas' | null;
}
