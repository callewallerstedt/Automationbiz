import { notFound } from "next/navigation";
import { DemoRunner } from "@/components/demo/demo-runner";
import { getDemoBySlug } from "@/lib/data";

type DemoPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DemoDetailPage({ params }: DemoPageProps) {
  const { slug } = await params;
  const data = await getDemoBySlug(slug);

  if (!data.demo) {
    notFound();
  }

  return <DemoRunner demo={data.demo} recentRuns={data.recentRuns} materials={data.materials} />;
}

