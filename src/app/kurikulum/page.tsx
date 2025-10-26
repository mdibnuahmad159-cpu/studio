import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { curriculum, extracurricular } from "@/lib/data";

export default function KurikulumPage() {
  return (
    <div className="bg-background">
      <div className="container py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">Struktur Kurikulum</h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Landasan akademis kami yang dirancang untuk keunggulan dan relevansi global.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
                <h2 className="font-headline text-2xl md:text-3xl font-bold mb-6">Jenjang Pendidikan</h2>
                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                    {curriculum.map((level, index) => (
                        <AccordionItem value={`item-${index}`} key={level.title} className="bg-card border-l-4 border-primary rounded-lg mb-4 px-4 shadow-sm">
                            <AccordionTrigger className="font-headline text-lg hover:no-underline">{level.title}</AccordionTrigger>
                            <AccordionContent className="pt-2">
                                <p className="text-muted-foreground mb-4">{level.description}</p>
                                <h4 className="font-semibold mb-2">Mata Pelajaran Utama:</h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                    {level.subjects.map(subject => (
                                        <li key={subject} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            {subject}
                                        </li>
                                    ))}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
            <div className="lg:col-span-1">
                <h2 className="font-headline text-2xl md:text-3xl font-bold mb-6">Ekstrakurikuler</h2>
                <div className="space-y-4">
                    {extracurricular.map((category) => (
                        <Card key={category.title} className="bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="font-headline text-lg text-primary">{category.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {category.activities.map(activity => (
                                        <li key={activity} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CheckCircle className="h-4 w-4 text-accent" />
                                            {activity}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
