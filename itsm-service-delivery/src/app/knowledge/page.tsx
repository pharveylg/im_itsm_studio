import { KnowledgeAuthorConsole } from "@/components/knowledge-author-console";

export const dynamic = "force-dynamic";

export default function KnowledgePage() {
  return (
    <main className="mx-auto w-full max-w-[1500px] px-5 py-8 sm:px-8">
      <KnowledgeAuthorConsole />
    </main>
  );
}
