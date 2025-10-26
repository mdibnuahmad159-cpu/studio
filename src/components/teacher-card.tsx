'use client';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User } from 'lucide-react';
import type { Teacher } from '@/lib/data';
import { useRef } from 'react';

interface TeacherCardProps {
  teacher: Teacher;
  onImageChange: (teacherId: number, image: string | null) => void;
}

export function TeacherCard({ teacher, onImageChange }: TeacherCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(teacher.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardContent className="p-6 text-center">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <Avatar className="w-full h-full text-4xl">
            {teacher.imageId ? (
              <AvatarImage src={teacher.imageId} alt={teacher.name} className="object-cover"/>
            ) : null }
            <AvatarFallback>
              <User />
            </AvatarFallback>
          </Avatar>
          <button 
            onClick={handleAvatarClick}
            className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-colors"
            aria-label="Ubah foto"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <CardTitle className="font-headline text-xl">{teacher.name}</CardTitle>
        <CardDescription className="text-primary font-semibold mt-1">{teacher.subject}</CardDescription>
        <p className="text-sm text-muted-foreground mt-4 h-20 overflow-hidden">{teacher.bio}</p>
      </CardContent>
    </Card>
  );
}