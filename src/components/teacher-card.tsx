
'use client';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Phone, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Guru as Teacher } from '@/lib/data';
import { useRef } from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';

interface TeacherCardProps {
  teacher: Teacher;
  onImageChange: (teacherId: string, image: string | null) => void;
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacher: Teacher) => void;
  isAdmin: boolean;
}

export function TeacherCard({ teacher, onImageChange, onEdit, onDelete, isAdmin }: TeacherCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    if (!isAdmin) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd upload this to Firebase Storage.
      // For now, we'll use a local blob URL.
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(teacher.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const whatsappLink = `https://wa.me/${teacher.whatsapp.replace(/[^0-9]/g, '')}`;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col group">
       {isAdmin && (
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(teacher)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(teacher)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Hapus</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
       )}
      <CardContent className="p-6 text-center flex-grow flex flex-col justify-between">
        <div>
          <div className="relative w-32 h-32 mx-auto mb-4">
            <Avatar className="w-full h-full text-4xl">
              {teacher.imageId ? (
                <AvatarImage src={teacher.imageId} alt={teacher.name} className="object-cover"/>
              ) : null }
              <AvatarFallback>
                <User />
              </AvatarFallback>
            </Avatar>
            {isAdmin && (
              <>
                <button 
                  onClick={handleAvatarClick}
                  className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-2 hover:bg-primary/90 transition-all"
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
              </>
            )}
          </div>
          <CardTitle className="font-headline text-xl">{teacher.name}</CardTitle>
          <CardDescription className="text-primary font-semibold mt-1">{teacher.position}</CardDescription>
        </div>
        <div className="mt-4">
          <Link href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <Phone className="h-4 w-4" />
            <span>{teacher.whatsapp}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
