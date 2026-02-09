import { NextResponse } from "next/server";
import { searchEverything } from "@/lib/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  const results = await searchEverything(query);
  return NextResponse.json(results);
}

