import { teachers } from '@/lib/data';
import { TeacherCard } from '@/components/teacher-card';

export default function GuruPage() {
  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Tenaga Pendidik Kami</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Bertemu dengan tim profesional yang berdedikasi untuk kesuksesan akademis dan personal siswa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} />
          ))}
        </div>
      </div>
    </div>
  );
}
