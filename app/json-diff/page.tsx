"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { FileUp, Trash2, Settings, Download, Globe, Plus, X, ChevronDown, Search } from "lucide-react";
import { diffLines } from "diff";
import { AUDIT_ENDPOINTS, AUDIT_TYPES, AuditType } from '@/app/config/auditEndpoints'

interface Header {
  key: string;
  value: string;
}

// Searchable Dropdown Component
interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  onSelectAuditType?: (type: string) => void;
}

function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "Search...",
  onSelectAuditType // Add this prop
}: SearchableDropdownProps & { onSelectAuditType?: (type: string) => void }) {

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    if (onSelectAuditType) {
      onSelectAuditType(option); // Call the callback when an audit type is selected
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search audit types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                    value === option ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JsonDiffApp() {
  const [file1Name, setFile1Name] = useState<string | null>(null);
  const [file2Name, setFile2Name] = useState<string | null>(null);
  const [json1Lines, setJson1Lines] = useState<string[]>([]);
  const [json2Lines, setJson2Lines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortKeys, setSortKeys] = useState<boolean>(true);
  const [sortArrays, setSortArrays] = useState<boolean>(true);
  const [mode, setMode] = useState<'file' | 'api'>('file');

  const handleAuditTypeSelect = (selectedType: AuditType | '') => {
    setAuditType(selectedType);
    
    if (selectedType && AUDIT_ENDPOINTS[selectedType]) {
      const endpoints = AUDIT_ENDPOINTS[selectedType];
      setUrlA(`${endpoints.urlA}`);
      setUrlB(`${endpoints.urlB}`);
    } else {
      // Clear URLs when no audit type is selected
      setUrlA('');
      setUrlB('');
    }
  };
  
  // API comparison state
  const [urlA, setUrlA] = useState('');
  const [urlB, setUrlB] = useState('');
  const [auditType, setAuditType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeout, setTimeout] = useState(15);
  
  // Headers state with defaults
  const [headersA, setHeadersA] = useState<Header[]>([
    { key: 'X-Origin-ID', value: 'TC' },
    { key: 'X-API-Version', value: '1.0' },
    { key: '', value: '' }
  ]);
  const [headersB, setHeadersB] = useState<Header[]>([
    { key: 'X-Origin-ID', value: 'TC' },
    { key: 'X-API-Version', value: '1.0' },
    { key: '', value: '' }
  ]);
  
  // Basic auth state with default username
  const [basicUserA, setBasicUserA] = useState('testusr');
  const [basicPassA, setBasicPassA] = useState('');
  const [basicUserB, setBasicUserB] = useState('testusr');
  const [basicPassB, setBasicPassB] = useState('');
  
  const currentYear = new Date().getFullYear();

  // Header management functions
  const addHeader = (type: 'A' | 'B') => {
    if (type === 'A') {
      setHeadersA([...headersA, { key: '', value: '' }]);
    } else {
      setHeadersB([...headersB, { key: '', value: '' }]);
    }
  };

  const removeHeader = (type: 'A' | 'B', index: number) => {
    if (type === 'A') {
      setHeadersA(headersA.filter((_, i) => i !== index));
    } else {
      setHeadersB(headersB.filter((_, i) => i !== index));
    }
  };

  const updateHeader = (type: 'A' | 'B', index: number, field: 'key' | 'value', value: string) => {
    if (type === 'A') {
      const newHeaders = [...headersA];
      newHeaders[index][field] = value;
      setHeadersA(newHeaders);
    } else {
      const newHeaders = [...headersB];
      newHeaders[index][field] = value;
      setHeadersB(newHeaders);
    }
  };

  // Function to sort arrays of objects by a consistent key
  function sortArrayOfObjects(arr: any[]): any[] {
    if (!Array.isArray(arr) || arr.length === 0) return arr;
    
    const firstItem = arr[0];
    if (typeof firstItem !== 'object' || firstItem === null) return arr;
    
    const sortKeys = ['listHierarchyId', 'id', 'name', 'key', 'type', 'order'];
    
    for (const sortKey of sortKeys) {
      if (firstItem.hasOwnProperty(sortKey)) {
        const allHaveKey = arr.every(item => 
          typeof item === 'object' && item !== null && item.hasOwnProperty(sortKey)
        );
        
        if (allHaveKey) {
          return [...arr].sort((a, b) => {
            const aVal = String(a[sortKey]);
            const bVal = String(b[sortKey]);
            return aVal.localeCompare(bVal);
          });
        }
      }
    }
    
    return arr;
  }

  function sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      const processedArray = obj.map(sortObjectKeys);
      return sortArrays ? sortArrayOfObjects(processedArray) : processedArray;
    } else if (obj !== null && typeof obj === 'object') {
      const sorted: any = {};
      Object.keys(obj)
        .sort()
        .forEach(key => {
          sorted[key] = sortObjectKeys(obj[key]);
        });
      return sorted;
    }
    return obj;
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    which: 1 | 2
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const processedJson = (sortKeys || sortArrays) ? sortObjectKeys(json) : json;
      const pretty = JSON.stringify(processedJson, null, 2);
      const lines = pretty.split("\n");
      
      if (which === 1) {
        setJson1Lines(lines);
        setFile1Name(file.name);
      } else {
        setJson2Lines(lines);
        setFile2Name(file.name);
      }
      setError(null);
    } catch (err: any) {
      setError(`❌ ${file.name} is not valid JSON: ${err.message}`);
    }
  }

  async function handleApiComparison() {
  if (!auditType || !urlA || !urlB) {
    setError('Please select an audit type and ensure both API URLs are filled');
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const params = new URLSearchParams({
      urlA,
      urlB,
      timeout: timeout.toString()
    });

    // Add headers for URL A
    headersA.forEach(header => {
      if (header.key && header.value) {
        params.append('headerA', `${header.key}: ${header.value}`);
      }
    });

    // Add headers for URL B
    headersB.forEach(header => {
      if (header.key && header.value) {
        params.append('headerB', `${header.key}: ${header.value}`);
      }
    });

    // Add basic auth for URL A
    if (basicUserA) params.append('basicUserA', basicUserA);
    if (basicPassA) params.append('basicPassA', basicPassA);

    // Add basic auth for URL B
    if (basicUserB) params.append('basicUserB', basicUserB);
    if (basicPassB) params.append('basicPassB', basicPassB);

    // Use the new JSON endpoint
    const response = await fetch(`http://localhost:8000/api/compare-json/${auditType}?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'API comparison failed');
    }

    const result = await response.json();
    const { apiA, apiB, urlA: fetchedUrlA, urlB: fetchedUrlB } = result.data;

    // Process and sort the JSON data
    const processedJsonA = (sortKeys || sortArrays) ? sortObjectKeys(apiA) : apiA;
    const processedJsonB = (sortKeys || sortArrays) ? sortObjectKeys(apiB) : apiB;

    const prettyA = JSON.stringify(processedJsonA, null, 2);
    const prettyB = JSON.stringify(processedJsonB, null, 2);

    const linesA = prettyA.split("\n");
    const linesB = prettyB.split("\n");

    // Set the data for comparison display
    setJson1Lines(linesA);
    setJson2Lines(linesB);
    setFile1Name(`API A (${new URL(fetchedUrlA).pathname})`);
    setFile2Name(`API B (${new URL(fetchedUrlB).pathname})`);

  } catch (err: any) {
    setError(`API comparison failed: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
}

  async function downloadApiComparison() {
    if (!urlA || !urlB) {
      setError('Both API URLs are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        urlA,
        urlB,
        timeout: timeout.toString()
      });

      // Add headers for URL A
      headersA.forEach(header => {
        if (header.key && header.value) {
          params.append('headerA', `${header.key}: ${header.value}`);
        }
      });

      // Add headers for URL B
      headersB.forEach(header => {
        if (header.key && header.value) {
          params.append('headerB', `${header.key}: ${header.value}`);
        }
      });

      // Add basic auth for URL A
      if (basicUserA) params.append('basicUserA', basicUserA);
      if (basicPassA) params.append('basicPassA', basicPassA);

      // Add basic auth for URL B
      if (basicUserB) params.append('basicUserB', basicUserB);
      if (basicPassB) params.append('basicPassB', basicPassB);

      const response = await fetch(`http://localhost:8000/api/run-test-automation/${auditType}?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'API comparison failed');
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${auditType.toUpperCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      setError(`API comparison failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setFile1Name(null);
    setFile2Name(null);
    setJson1Lines([]);
    setJson2Lines([]);
    setError(null);
    setUrlA('');
    setUrlB('');
    // Reset to defaults instead of empty
    setHeadersA([
      { key: 'X-Origin-ID', value: 'TC' },
      { key: 'X-API-Version', value: '1.0' },
      { key: '', value: '' }
    ]);
    setHeadersB([
      { key: 'X-Origin-ID', value: 'TC' },
      { key: 'X-API-Version', value: '1.0' },
      { key: '', value: '' }
    ]);
    setBasicUserA('testusr');
    setBasicPassA('');
    setBasicUserB('testusr');
    setBasicPassB('');
    setTimeout(15);
  }

  function handleSortToggle(type: 'keys' | 'arrays') {
    if (type === 'keys') {
      setSortKeys(!sortKeys);
    } else {
      setSortArrays(!sortArrays);
    }
    setJson1Lines([]);
    setJson2Lines([]);
  }

  const diffs = diffLines(json1Lines.join("\n"), json2Lines.join("\n"));

  const generateSideBySide = () => {
    const left: string[] = [];
    const right: string[] = [];
    let added = 0;
    let removed = 0;

    diffs.forEach((part) => {
      const lines = part.value.split("\n");
      if (lines[lines.length - 1] === "") lines.pop();

      lines.forEach((line) => {
        if (part.added) {
          left.push("");
          right.push(`+ ${line}`);
          added++;
        } else if (part.removed) {
          left.push(`- ${line}`);
          right.push("");
          removed++;
        } else {
          left.push(`  ${line}`);
          right.push(`  ${line}`);
        }
      });
    });

    return { left, right, added, removed };
  };

  const { left, right, added, removed } = generateSideBySide();
  const totalChanges = added + removed;
  const unchanged = left.filter(
    (line, i) =>
      !line.startsWith("+") && !line.startsWith("-") && right[i] === line
  ).length;
  const totalLines = Math.max(json1Lines.length, json2Lines.length);
  const similarityPercent =
    totalLines > 0 ? ((unchanged / totalLines) * 100).toFixed(1) : "100.0";

  const hasComparison = json1Lines.length > 0 && json2Lines.length > 0;

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center p-6 space-y-6">
      <h1 className="text-3xl font-bold">Infinity API Compare</h1>

      <Card className="w-full max-w-5xl p-4 space-y-4">
        <CardContent className="space-y-4">
          {/* Mode Selection */}
          <div className="flex space-x-2 p-2 bg-gray-100 rounded-lg">
            <Button
              variant={mode === 'file' ? 'default' : 'outline'}
              onClick={() => setMode('file')}
              className="flex-1"
            >
              <FileUp className="mr-2 w-4 h-4" />
              File Upload
            </Button>
            <Button
              variant={mode === 'api' ? 'default' : 'outline'}
              onClick={() => setMode('api')}
              className="flex-1"
            >
              <Globe className="mr-2 w-4 h-4" />
              API Comparison
            </Button>
          </div>

          {mode === 'api' && (
            <div className="space-y-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold">API Response Comparison</h3>
              
              {/* Basic Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Audit Type</label>
                  <SearchableDropdown
                    value={auditType}
                    onChange={handleAuditTypeSelect}
                    options={Object.keys(AUDIT_ENDPOINTS) as AuditType[]}
                    placeholder="Select Audit Type"
                    onSelectAuditType={handleAuditTypeSelect}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    value={timeout}
                    onChange={(e) => setTimeout(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* URL A Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium text-blue-700">Java 17 FS</h4>
                  <div>
                    <label className="block text-sm font-medium mb-1">Endpoint *</label>
                    <Input
                      type="url"
                      placeholder="https://api.example.com/endpoint1"
                      value={urlA}
                      onChange={(e) => setUrlA(e.target.value)}
                    />
                  </div>
                  
                  {/* Basic Auth A */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Username</label>
                      <Input
                        placeholder="username"
                        value={basicUserA}
                        onChange={(e) => setBasicUserA(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <Input
                        type="password"
                        placeholder="password"
                        value={basicPassA}
                        onChange={(e) => setBasicPassA(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Headers A */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Headers</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addHeader('A')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {headersA.map((header, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="Header name"
                          value={header.key}
                          onChange={(e) => updateHeader('A', index, 'key', e.target.value)}
                        />
                        <Input
                          placeholder="Header value"
                          value={header.value}
                          onChange={(e) => updateHeader('A', index, 'value', e.target.value)}
                        />
                        {headersA.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeHeader('A', index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* URL B Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium text-green-700">Java 8 TC</h4>
                  <div>
                    <label className="block text-sm font-medium mb-1">Endpoint *</label>
                    <Input
                      type="url"
                      placeholder="https://api.example.com/endpoint2"
                      value={urlB}
                      onChange={(e) => setUrlB(e.target.value)}
                    />
                  </div>
                  
                  {/* Basic Auth B */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Username</label>
                      <Input
                        placeholder="username"
                        value={basicUserB}
                        onChange={(e) => setBasicUserB(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Password</label>
                      <Input
                        type="password"
                        placeholder="password"
                        value={basicPassB}
                        onChange={(e) => setBasicPassB(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Headers B */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Headers</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addHeader('B')}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {headersB.map((header, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="Header name"
                          value={header.key}
                          onChange={(e) => updateHeader('B', index, 'key', e.target.value)}
                        />
                        <Input
                          placeholder="Header value"
                          value={header.value}
                          onChange={(e) => updateHeader('B', index, 'value', e.target.value)}
                        />
                        {headersB.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeHeader('B', index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleApiComparison}
                  disabled={isLoading || !urlA || !urlB}
                  className="flex-1"
                >
                  {isLoading ? (
                    'Comparing APIs...'
                  ) : (
                    <>
                      <Globe className="mr-2 w-4 h-4" />
                      Compare Responses
                    </>
                  )}
                </Button>
                
                {hasComparison && (
                  <Button
                    onClick={downloadApiComparison}
                    disabled={isLoading}
                    variant="outline"
                  >
                    <Download className="mr-2 w-4 h-4" />
                    Download ZIP
                  </Button>
                )}
              </div>
            </div>
          )}

          {mode === 'file' && (
            <>
              {/* Settings */}
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Comparison Options:</span>
                </div>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sortKeys}
                    onChange={() => handleSortToggle('keys')}
                    className="rounded"
                  />
                  <span className="text-sm">
                    Sort object keys (ignores property order differences)
                  </span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sortArrays}
                    onChange={() => handleSortToggle('arrays')}
                    className="rounded"
                  />
                  <span className="text-sm">
                    Sort arrays of objects (by id, name, listHierarchyId, etc.)
                  </span>
                </label>
              </div>

              <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
                <label className="flex-1 cursor-pointer">
                  <span className="flex items-center justify-center border border-dashed border-primary rounded-lg p-4 h-32 hover:bg-primary/10">
                    <FileUp className="mr-2" />
                    {file1Name ? file1Name : "Upload first JSON"}
                  </span>
                  <input
                    key={`${file1Name ?? "file1"}-${sortKeys}-${sortArrays}`}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 1)}
                  />
                </label>

                <label className="flex-1 cursor-pointer">
                  <span className="flex items-center justify-center border border-dashed border-primary rounded-lg p-4 h-32 hover:bg-primary/10">
                    <FileUp className="mr-2" />
                    {file2Name ? file2Name : "Upload second JSON"}
                  </span>
                  <input
                    key={`${file2Name ?? "file2"}-${sortKeys}-${sortArrays}`}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, 2)}
                  />
                </label>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              variant="destructive"
              disabled={!file1Name && !file2Name && !urlA && !urlB}
              onClick={reset}
            >
              <Trash2 className="mr-1 w-4 h-4" /> Reset
            </Button>
          </div>

          {error && <p className="text-red-600 whitespace-pre-wrap">{error}</p>}

          {hasComparison && (
            <>
              <p className="text-sm text-gray-700 font-medium">
                Summary:
                <span className="text-green-600"> {added} lines added</span>,
                <span className="text-red-600"> {removed} lines removed</span>,
                <span className="text-gray-600"> {unchanged} lines unchanged</span>.
                {mode === 'api' ? 'APIs are' : 'Files are'} <strong>{similarityPercent}% identical</strong> (
                <em>{totalChanges} total differences</em>).
                {(sortKeys || sortArrays) && (
                  <span className="text-blue-600">
                    {' '}Normalized for comparison
                    {sortKeys && sortArrays ? ' (keys + arrays sorted)' : 
                     sortKeys ? ' (keys sorted)' : ' (arrays sorted)'}.
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-2 bg-black text-white text-sm p-4 rounded-lg overflow-x-auto max-h-[60vh]">
                <div className="pr-2 border-r border-white/20">
                  <h2 className="font-bold mb-2">{file1Name}</h2>
                  <pre className="whitespace-pre-wrap">
                    {left.map((line, idx) => (
                      <div
                        key={idx}
                        className={
                          line.startsWith("-")
                            ? "text-red-400"
                            : line.startsWith("+")
                            ? "text-green-400"
                            : ""
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
                <div className="pl-2">
                  <h2 className="font-bold mb-2">{file2Name}</h2>
                  <pre className="whitespace-pre-wrap">
                    {right.map((line, idx) => (
                      <div
                        key={idx}
                        className={
                          line.startsWith("-")
                            ? "text-red-400"
                            : line.startsWith("+")
                            ? "text-green-400"
                            : ""
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <footer className="text-xs text-gray-500">
        Infinity © {currentYear} . All rights reserved. Built with React, TailwindCSS & diff.js
      </footer>
    </div>
  );
}