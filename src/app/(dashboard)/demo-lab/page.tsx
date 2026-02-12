import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { DEMO_SLUG_ORDER, DEMO_STATUS_COLORS } from "@/lib/constants";
import { getDemoList } from "@/lib/data";

export default async function DemoLabPage() {
  const demos = await getDemoList();
  const ordered = [...demos].sort((a, b) => DEMO_SLUG_ORDER.indexOf(a.slug as (typeof DEMO_SLUG_ORDER)[number]) - DEMO_SLUG_ORDER.indexOf(b.slug as (typeof DEMO_SLUG_ORDER)[number]));

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>Demo Library</CardTitle>
        <CardDescription className="mt-1">Sales assets with live workflows. Each demo supports input-output preview and acceptance.</CardDescription>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {ordered.map((demo) => (
          <Link key={demo.id} href={`/demo-lab/${demo.slug}`}>
            <Card className="h-full p-5 hover:border-zinc-600/40">
              <div className="mb-3 flex items-center justify-between">
                <CardTitle>{demo.title}</CardTitle>
                <Badge className={DEMO_STATUS_COLORS[demo.status]}>{demo.status}</Badge>
              </div>
              <CardDescription>{demo.description}</CardDescription>
              <p className="mt-4 text-sm text-zinc-300">
                Open demo <ArrowRight className="ml-1 inline h-4 w-4" />
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

