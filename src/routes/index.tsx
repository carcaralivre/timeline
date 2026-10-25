import { createFileRoute } from "@tanstack/react-router";
import { Timeline } from "@/components/timeline/Timeline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tempo — Linha do tempo com zoom" },
      { name: "description", content: "Linha do tempo da vida com zoom livre, de décadas a dias." },
      { property: "og:title", content: "Tempo — Linha do tempo com zoom" },
      { property: "og:description", content: "Linha do tempo da vida com zoom livre, de décadas a dias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-3 sm:px-4 lg:px-6">
          <span className="text-sm font-bold tracking-[0.08em] uppercase">Tempo</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-3 py-6 sm:px-4 lg:px-6 lg:py-8">
        <p className="mb-6 text-[13px] text-muted-foreground">
          Role para dar zoom, arraste o fundo para navegar. Arraste um evento para mover datas ou trocar de linha; clique para editar.
        </p>
        <Timeline />
      </main>
    </div>
  );
}
