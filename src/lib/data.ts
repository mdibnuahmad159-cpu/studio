export const teachers = [
  {
    id: 1,
    name: 'Budi Santoso, M.Pd.',
    subject: 'Kepala Sekolah, Matematika',
    imageId: 'teacher-male-1',
    bio: 'Berpengalaman lebih dari 15 tahun dalam dunia pendidikan dan berkomitmen untuk menciptakan lingkungan belajar yang inspiratif.'
  },
  {
    id: 2,
    name: 'Citra Lestari, S.S.',
    subject: 'Bahasa Inggris',
    imageId: 'teacher-female-1',
    bio: 'Lulusan Sastra Inggris dengan predikat cum laude, memiliki sertifikasi mengajar internasional.'
  },
  {
    id: 3,
    name: 'Agus Wijaya, S.Kom.',
    subject: 'Teknologi Informasi',
    imageId: 'teacher-male-2',
    bio: 'Praktisi IT yang beralih ke dunia pendidikan untuk mempersiapkan generasi digital.'
  },
  {
    id: 4,
    name: 'Dewi Anjani, S.Si.',
    subject: 'Sains (Fisika, Kimia)',
    imageId: 'teacher-female-2',
    bio: 'Memiliki semangat tinggi dalam membuat sains menjadi pelajaran yang menyenangkan dan mudah dipahami.'
  },
  {
    id: 5,
    name: 'Eko Prasetyo, S.Pd.',
    subject: 'Pendidikan Jasmani',
    imageId: 'teacher-male-3',
    bio: 'Mantan atlet nasional yang berdedikasi untuk membangun karakter dan kesehatan siswa melalui olahraga.'
  },
  {
    id: 6,
    name: 'Fitriani, S.Sn.',
    subject: 'Seni Budaya',
    imageId: 'teacher-female-3',
    bio: 'Seniman multi-talenta yang menginspirasi siswa untuk berekspresi secara kreatif.'
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

export const curriculum = [
    {
        title: "Kurikulum Tingkat Dasar (Kelas 1-6)",
        description: "Fokus pada pengembangan fundamental literasi, numerasi, dan karakter. Menggunakan metode belajar sambil bermain untuk menumbuhkan kecintaan terhadap ilmu pengetahuan.",
        subjects: ["Bahasa Indonesia", "Matematika Dasar", "Sains Pengantar", "Pendidikan Kewarganegaraan", "Seni & Kerajinan", "Pendidikan Jasmani"]
    },
    {
        title: "Kurikulum Tingkat Menengah (Kelas 7-9)",
        description: "Pendalaman materi dan persiapan menuju jenjang yang lebih tinggi. Siswa mulai diperkenalkan pada peminatan dan proyek-proyek kolaboratif.",
        subjects: ["Matematika Terpadu", "Fisika", "Biologi", "Kimia", "Bahasa Inggris Lanjutan", "Sejarah", "Geografi", "Ekonomi", "Teknologi Informasi"]
    },
    {
        title: "Kurikulum Tingkat Atas (Kelas 10-12)",
        description: "Program peminatan (IPA/IPS) untuk mempersiapkan siswa ke perguruan tinggi. Diperkaya dengan program magang, penelitian, dan kewirausahaan.",
        subjects: ["Kalkulus", "Fisika Lanjutan", "Kimia Organik", "Biologi Molekuler", "Sosiologi", "Akuntansi", "Sastra Inggris", "Bahasa Asing Pilihan (Jerman/Mandarin)"]
    },
];

export const extracurricular = [
    {
        title: "Klub Olahraga",
        activities: ["Sepak Bola", "Basket", "Bulu Tangkis", "Renang"]
    },
    {
        title: "Seni & Budaya",
        activities: ["Tari Tradisional", "Teater & Drama", "Musik Modern (Band)", "Seni Lukis"]
    },
    {
        title: "Akademik & Teknologi",
        activities: ["Klub Robotik", "Olimpiade Sains", "Debat Bahasa Inggris", "Klub Jurnalistik"]
    }
];

export type Teacher = {
  id: number;
  name: string;
  subject: string;
  imageId: string | null;
  bio: string;
};