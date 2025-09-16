"use client";

import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Home from "@/app/page";

export default function VulnerabilityAutomationPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedAuditTypes, setSelectedAuditTypes] = useState<string[]>([]);
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("");
  const [commitMessage, setCommitMessage] = useState(""); 
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch repos on mount
  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("http://localhost:8000/api/update-repos");
        const data = await res.json();
        if (res.ok) {
          console.log("repos successfully updated")
          setRepos(data.results || []);
        } else {
          console.log(data.message)
          setError(data.message || "Failed to load repos");
        }
      } catch (err: any) {
        setError(err.message);
      }

    }
    fetchRepos();
  }, []);

  return (
    Home()
  );
}
