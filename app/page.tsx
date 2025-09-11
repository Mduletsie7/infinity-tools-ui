"use client";

import Link from "next/link";
import { Button } from "../components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-8 p-6">
      <h1 className="text-4xl font-bold">Infinity Tools</h1>
      
      <div className="flex gap-4">
        <Link href="/json-diff">
          <Button className="px-6 py-3 text-lg">API Diff Tool</Button>
        </Link>

        <Link href="/vulnerability-auto">
          <Button className="px-6 py-3 text-lg">Vulnerability Automation</Button>
        </Link>
      </div>
    </div>
  );
}
