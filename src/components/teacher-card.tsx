import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { teachers } from '@/lib/data';

type Teacher = (typeof teachers)[0];

interface TeacherCardProps {
  teacher: Teacher;
}

export function TeacherCard({ teacher }: TeacherCardProps) {
  const teacherImage = PlaceHolderImages.find(p => p.id === teacher.imageId);

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative h-64 w-full">
          {teacherImage ? (
            <Image
              src={teacherImage.imageUrl}
              alt={teacher.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={teacherImage.imageHint}
            />
          ) : (
            <div className="h-full w-full bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground">No Image</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 text-center">
        <CardTitle className="font-headline text-xl">{teacher.name}</CardTitle>
        <CardDescription className="text-primary font-semibold mt-1">{teacher.subject}</CardDescription>
        <p className="text-sm text-muted-foreground mt-4 h-20 overflow-hidden">{teacher.bio}</p>
      </CardContent>
    </Card>
  );
}
