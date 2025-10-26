import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, BookOpen, Lightbulb, Users } from 'lucide-react';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-students');
  const facilityImage = PlaceHolderImages.find(p => p.id === 'school-facility');

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[80vh] w-full">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-4">
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight">
            Selamat Datang di <span className="text-primary">VibrantEdu</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg md:text-xl text-gray-200">
            Membuka Potensi, Membangun Masa Depan.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/kurikulum">Lihat Kurikulum</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="#">Daftar Sekarang <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="text-center">
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Mengapa Memilih Kami?</h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              Kami berkomitmen untuk memberikan pendidikan terbaik dengan pendekatan modern.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <Card className="text-center transform hover:-translate-y-2 transition-transform duration-300 shadow-md hover:shadow-xl border-t-4 border-accent">
              <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent-foreground">
                  <Lightbulb className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle className="font-headline mt-4">Pembelajaran Inovatif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Kurikulum yang adaptif dengan teknologi terkini untuk menyiapkan siswa menghadapi tantangan global.</p>
              </CardContent>
            </Card>
            <Card className="text-center transform hover:-translate-y-2 transition-transform duration-300 shadow-md hover:shadow-xl border-t-4 border-primary">
              <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Users className="h-8 w-8" />
                </div>
                <CardTitle className="font-headline mt-4">Guru Profesional</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Tenaga pendidik berpengalaman dan berdedikasi tinggi untuk membimbing siswa mencapai potensi terbaiknya.</p>
              </CardContent>
            </Card>
            <Card className="text-center transform hover:-translate-y-2 transition-transform duration-300 shadow-md hover:shadow-xl border-t-4 border-green-500">
              <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-600">
                  <BookOpen className="h-8 w-8" />
                </div>
                <CardTitle className="font-headline mt-4">Lingkungan Belajar Kondusif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Fasilitas lengkap dan lingkungan yang aman serta nyaman untuk mendukung proses belajar mengajar.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Tentang VibrantEdu</h2>
            <p className="mt-4 text-muted-foreground">
              Didirikan pada tahun 2010, VibrantEdu memiliki visi untuk menjadi lembaga pendidikan terdepan yang menghasilkan lulusan cerdas, kreatif, dan berkarakter. Kami percaya bahwa setiap anak adalah unik dan memiliki potensi luar biasa.
            </p>
            <p className="mt-4 text-muted-foreground">
              Dengan perpaduan kurikulum nasional dan internasional, kami membekali siswa dengan pengetahuan akademis yang kuat serta keterampilan hidup yang esensial di abad ke-21.
            </p>
            <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/guru">Kenali Pengajar Kami</Link>
            </Button>
          </div>
          <div className="relative h-80 w-full rounded-lg overflow-hidden shadow-lg">
            {facilityImage && (
              <Image
                src={facilityImage.imageUrl}
                alt={facilityImage.description}
                fill
                className="object-cover"
                data-ai-hint={facilityImage.imageHint}
              />
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Siap Bergabung dengan Keluarga Besar VibrantEdu?</h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            Jadilah bagian dari komunitas pembelajar kami dan mulailah perjalanan akademis Anda yang luar biasa.
          </p>
          <Button asChild size="lg" className="mt-8 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="#">Informasi Pendaftaran</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
