import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Play
} from 'lucide-react';
import { CsvImportResult } from './types';

interface LeadCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteImport: (
    parsedRows: any[],
    options: { skipDuplicates: boolean; updateDuplicates: boolean }
  ) => Promise<CsvImportResult | null>;
}

// Split a CSV line respecting quotes
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export const LeadCsvImportModal: React.FC<LeadCsvImportModalProps> = ({
  isOpen,
  onClose,
  onExecuteImport
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [invalidRowsCount, setInvalidRowsCount] = useState<number>(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSampleCsv = () => {
    const sampleHeaders = [
      'Company Name',
      'Contact Person',
      'Email',
      'Phone',
      'Industry',
      'Location',
      'LinkedIn',
      'Power BI Use Case',
      'Lead Priority',
      'Status',
      'Follow-up Date',
      'Notes'
    ];

    const sampleRows = [
      [
        'Apex Manufacturing Ltd',
        'Rajesh Sharma (VP Ops)',
        'rajesh.sharma@apexind.com',
        '+91 98200 11223',
        'Manufacturing',
        'Pune, Maharashtra',
        'https://linkedin.com/in/sample',
        'Wants real-time plant OEE dashboard and SAP data integration.',
        'High',
        'Not Contacted',
        new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        'Referred by enterprise conference.'
      ],
      [
        'Global FinTech Solutions',
        'Priya Nair',
        'priya.n@globalfin.io',
        '+91 99300 44556',
        'Financial Services',
        'Bengaluru',
        'https://linkedin.com/in/sample2',
        'Automated executive revenue KPI dashboard and SQL data warehouse connection.',
        'Medium',
        'Not Contacted',
        '',
        'Found via LinkedIn search.'
      ]
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [
      sampleHeaders.join(','),
      ...sampleRows.map(row => row.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'ProBItian_Leads_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        alert('CSV file must have a header row and at least 1 data row.');
        return;
      }

      const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().trim().replace(/['"_]/g, ''));
      const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('business') || h.includes('org') || h.includes('name'));
      const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
      const contactIdx = headers.findIndex(h => h.includes('contact') || h.includes('person') || h.includes('lead'));
      const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact num'));
      const industryIdx = headers.findIndex(h => h.includes('industry') || h.includes('sector') || h.includes('vertical'));
      const locationIdx = headers.findIndex(h => h.includes('location') || h.includes('city') || h.includes('state') || h.includes('country'));
      const linkedinIdx = headers.findIndex(h => h.includes('linkedin') || h.includes('social') || h.includes('profile'));
      const usecaseIdx = headers.findIndex(h => h.includes('powerbi') || h.includes('use case') || h.includes('requirement') || h.includes('need') || h.includes('project'));
      const priorityIdx = headers.findIndex(h => h.includes('priority') || h.includes('tier') || h.includes('importance'));
      const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('state') || h.includes('stage'));
      const followUpIdx = headers.findIndex(h => h.includes('follow') || h.includes('due') || h.includes('next'));
      const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('remark') || h.includes('background'));

      const validRows: any[] = [];
      let invalidCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = splitCsvLine(lines[i]);
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const company = companyIdx !== -1 ? row[companyIdx] : (row[0] || '');
        const email = emailIdx !== -1 ? row[emailIdx] : (row[1] || '');

        if (!company || !email || !email.includes('@')) {
          invalidCount++;
          continue;
        }

        validRows.push({
          company_name: company,
          email: email.trim().toLowerCase(),
          contact_person: contactIdx !== -1 ? row[contactIdx] : '',
          phone: phoneIdx !== -1 ? row[phoneIdx] : '',
          industry: industryIdx !== -1 ? row[industryIdx] : '',
          location: locationIdx !== -1 ? row[locationIdx] : '',
          linkedin: linkedinIdx !== -1 ? row[linkedinIdx] : '',
          powerbi_use_case: usecaseIdx !== -1 ? row[usecaseIdx] : '',
          lead_priority: priorityIdx !== -1 && ['High', 'Medium', 'Low'].includes(row[priorityIdx]) ? row[priorityIdx] : 'Medium',
          status: statusIdx !== -1 ? row[statusIdx] : 'Not Contacted',
          follow_up_date: followUpIdx !== -1 && row[followUpIdx] ? row[followUpIdx] : null,
          notes: notesIdx !== -1 ? row[notesIdx] : ''
        });
      }

      setParsedRows(validRows);
      setInvalidRowsCount(invalidCount);
    };

    reader.readAsText(file);
  };

  const handleRunImport = async () => {
    setImporting(true);
    const res = await onExecuteImport(parsedRows, { skipDuplicates, updateDuplicates });
    setImporting(false);
    if (res) {
      setImportResult(res);
    }
  };

  const handleResetModal = () => {
    setCsvFile(null);
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Import Leads from CSV
              </h3>
              <p className="text-[11px] text-slate-500">
                Bulk upload B2B prospects, requirements, and contact details
              </p>
            </div>
          </div>
          <button
            onClick={handleResetModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Download Template */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40">
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">
                Need a pre-formatted template?
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Download a clean sample CSV with standard columns for Power BI use cases, contacts, and priorities.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Step 2: Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select CSV File
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20"
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {csvFile ? csvFile.name : 'Click to select or drag & drop a .csv file'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports up to 5,000 leads per file. UTF-8 encoded.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Step 3: Parsed Summary & Options */}
          {parsedRows.length > 0 && !importResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{parsedRows.length} Valid Leads Ready</span>
                  </div>
                  {invalidRowsCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{invalidRowsCount} Skipped (Missing Company or Email)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deduplication Options */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300">Duplicate Handling (by Email)</p>
                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => {
                        setSkipDuplicates(e.target.value === 'true' || e.target.checked);
                        if (e.target.checked) setUpdateDuplicates(false);
                      }}
                      className="rounded text-purple-600"
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      Skip leads if email already exists in database (Recommended)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateDuplicates}
                      onChange={(e) => {
                        setUpdateDuplicates(e.target.value === 'true' || e.target.checked);
                        if (e.target.checked) setSkipDuplicates(false);
                      }}
                      className="rounded text-purple-600"
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      Update existing leads if email matches
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Table of First 5 */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Preview (First 5 Rows)
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2">Company</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Contact</th>
                        <th className="p-2">Industry</th>
                        <th className="p-2">Use Case</th>
                        <th className="p-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2 font-semibold text-slate-800 dark:text-slate-200">{r.company_name}</td>
                          <td className="p-2 text-purple-600 dark:text-purple-400">{r.email}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">{r.contact_person || '—'}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">{r.industry || '—'}</td>
                          <td className="p-2 text-slate-500 truncate max-w-xs">{r.powerbi_use_case || '—'}</td>
                          <td className="p-2 font-bold text-slate-700 dark:text-slate-300">{r.lead_priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Execution Result Screen */}
          {importResult && (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                Import Process Completed!
              </h4>
              <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto text-xs py-2">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Imported</p>
                  <p className="text-lg font-black text-emerald-600">{importResult.importedCount || 0}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Updated</p>
                  <p className="text-lg font-black text-blue-600">{importResult.updatedCount || 0}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Skipped</p>
                  <p className="text-lg font-black text-slate-500">{importResult.skippedCount || 0}</p>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="text-left bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Import Warnings:</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {importResult.errors.slice(0, 5).map((e: any, idx: number) => (
                      <li key={idx}>{typeof e === 'string' ? e : e?.message || JSON.stringify(e)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-end gap-2">
          {importResult ? (
            <button
              onClick={handleResetModal}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              Done & Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetModal}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0 || importing}
                onClick={handleRunImport}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{importing ? 'Importing Leads...' : `Import ${parsedRows.length} Leads`}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
