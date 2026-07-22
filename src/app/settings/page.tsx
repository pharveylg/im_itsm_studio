import { headers } from "next/headers";
import { ConnectionConsole } from "@/components/connection-console";
import { AiProviderConsole } from "@/components/ai-provider-console";
import { CollapsibleSection } from "@/components/collapsible-section";
import { getConnectionState } from "@/lib/connection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const connection = await getConnectionState();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const defaultRedirectUri = `${proto}://${host}/api/servicenow/auth/callback`;

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-8 px-5 pb-20 pt-10 sm:px-8">
      <CollapsibleSection
        title="AI Analysis Engine"
        subtitle="Configure multiple AI providers and switch between them per analysis."
        defaultOpen
      >
        <AiProviderConsole />
      </CollapsibleSection>

      <CollapsibleSection
        title="ServiceNow Connection"
        badge="Coming Soon"
        badgeColor="amber"
        subtitle="REST API integration — once enabled, it will pull records directly from ServiceNow without XML exports."
        defaultOpen={false}
      >
        <ConnectionConsole
          connection={connection}
          defaultRedirectUri={defaultRedirectUri}
        />
      </CollapsibleSection>
    </main>
  );
}
