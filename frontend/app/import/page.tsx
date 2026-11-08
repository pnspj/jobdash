'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { fetchCompanies, importCompanies } from '@/lib/api';
import { parseCsv } from '@/lib/csv';
import {
  ACTION_STATUSES,
  SELECTION_PHASES,
  TARGET_FIELDS,
  autoMapEnum,
  convertRow,
  distinctValues,
  guessMapping,
  normalizeKey,
  type ColumnMapping,
  type ImportDefaults,
  type TargetField,
} from '@/lib/csvMapping';
import type { ActionStatus, SelectionPhase } from '@/lib/types';
import { ActionBadge, PhaseBadge } from '@/components/Badges';

type Encoding = 'utf-8' | 'shift_jis';

interface CsvData {
  fileName: string;
  headers: string[];
  rows: string[][];
}

const selectClass = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';
const sectionClass = 'rounded-lg border border-slate-200 bg-white p-6 shadow-sm';

export default function ImportPage() {
  const [encoding, setEncoding] = useState<Encoding>('utf-8');
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState<CsvData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [phaseOverrides, setPhaseOverrides] = useState<Record<string, SelectionPhase>>({});
  const [actionOverrides, setActionOverrides] = useState<Record<string, ActionStatus>>({});
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<ImportDefaults>({ phase: '書類選考', action: '要対応' });

  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  // Existing companies, for duplicate detection
  useEffect(() => {
    fetchCompanies()
      .then((list) => setExistingNames(new Set(list.map((c) => normalizeKey(c.companyName)))))
      .catch(() => setExistingNames(new Set()));
  }, [importedCount]);

  // (Re-)parse when the file or encoding changes
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    file
      .arrayBuffer()
      .then((buf) => {
        if (cancelled) return;
        const rows = parseCsv(new TextDecoder(encoding).decode(buf));
        if (rows.length < 2) throw new Error('ヘッダー行とデータ行が必要です');
        const [headers, ...data] = rows;
        setCsv({ fileName: file.name, headers: headers.map((h) => h.trim()), rows: data });
        setMapping(guessMapping(headers));
        setPhaseOverrides({});
        setActionOverrides({});
        setAgentNames({});
        setExcluded(new Set());
        setParseError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCsv(null);
        setMapping(null);
        setParseError(err instanceof Error ? err.message : 'CSVの読み込みに失敗しました');
      });
    return () => {
      cancelled = true;
    };
  }, [file, encoding]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setImportedCount(null);
    setImportError(null);
    setFile(e.target.files?.[0] ?? null);
  };

  // ----- derived state -----

  const phaseRaw = useMemo(() => (csv && mapping ? distinctValues(csv.rows, mapping.phase) : []), [csv, mapping]);
  const actionRaw = useMemo(() => (csv && mapping ? distinctValues(csv.rows, mapping.action) : []), [csv, mapping]);
  const agentRaw = useMemo(() => (csv && mapping ? distinctValues(csv.rows, mapping.agent) : []), [csv, mapping]);

  const phaseMap = useMemo(() => autoMapEnum(phaseRaw, SELECTION_PHASES, phaseOverrides), [phaseRaw, phaseOverrides]);
  const actionMap = useMemo(() => autoMapEnum(actionRaw, ACTION_STATUSES, actionOverrides), [actionRaw, actionOverrides]);

  const countBy = (idx: number | null) => {
    const counts = new Map<string, number>();
    if (csv && idx !== null) for (const r of csv.rows) counts.set((r[idx] ?? '').trim(), (counts.get((r[idx] ?? '').trim()) ?? 0) + 1);
    return counts;
  };

  const converted = useMemo(() => {
    if (!csv || !mapping) return [];
    return csv.rows.map((row, i) => {
      const result = convertRow(row, i + 1, mapping, { phase: phaseMap, action: actionMap, agent: agentNames }, defaults);
      const duplicate = existingNames.has(normalizeKey(result.input.companyName));
      return { ...result, duplicate };
    });
  }, [csv, mapping, phaseMap, actionMap, agentNames, defaults, existingNames]);

  const isIncluded = (r: (typeof converted)[number]) =>
    r.errors.length === 0 && !(skipDuplicates && r.duplicate) && !excluded.has(r.rowNumber);

  const toImport = converted.filter(isIncluded);
  const errorCount = converted.filter((r) => r.errors.length > 0).length;
  const duplicateCount = converted.filter((r) => r.errors.length === 0 && r.duplicate).length;
  const unmappedValues = phaseRaw.filter((v) => !phaseMap[v]).length + actionRaw.filter((v) => !actionMap[v]).length;

  const setColumn = (key: TargetField, value: string) =>
    setMapping((prev) => (prev ? { ...prev, [key]: value === '' ? null : Number(value) } : prev));

  const sample = (idx: number | null) => {
    if (!csv || idx === null) return '';
    return csv.rows.map((r) => (r[idx] ?? '').trim()).find((v) => v !== '') ?? '';
  };

  const toggleRow = (rowNumber: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });

  const handleImport = async () => {
    setImporting(true);
    setImportError(null);
    try {
      const res = await importCompanies(toImport.map((r) => r.input));
      setImportedCount(res.imported);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'インポートに失敗しました');
    } finally {
      setImporting(false);
    }
  };

  // ----- render -----

  if (importedCount !== null) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
          <p className="text-lg font-semibold">{importedCount} 件の企業をインポートしました。</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            一覧へ
          </Link>
          <button
            onClick={() => {
              setImportedCount(null);
              setFile(null);
              setCsv(null);
              setMapping(null);
            }}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            別のCSVをインポート
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← 一覧へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold">CSVインポート</h1>
        <p className="text-sm text-slate-500">
          1行目をヘッダーとして読み込みます。Notion のデータベースからエクスポートしたCSVや、JobDash でエクスポートしたCSVを取り込めます。
        </p>
      </div>

      {/* Step 1: file */}
      <section className={sectionClass}>
        <h2 className="mb-4 text-lg font-semibold">1. ファイルを選択</h2>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            文字コード
            <select value={encoding} onChange={(e) => setEncoding(e.target.value as Encoding)} className={`${selectClass} w-auto`}>
              <option value="utf-8">UTF-8</option>
              <option value="shift_jis">Shift_JIS (Excel)</option>
            </select>
          </label>
        </div>
        {parseError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>}
        {csv && (
          <p className="mt-3 text-sm text-slate-600">
            {csv.fileName}: {csv.headers.length} 列 × {csv.rows.length} 行
          </p>
        )}
      </section>

      {csv && mapping && (
        <>
          {/* Step 2: column mapping */}
          <section className={sectionClass}>
            <h2 className="mb-1 text-lg font-semibold">2. 列の対応付け</h2>
            <p className="mb-4 text-sm text-slate-500">JobDash の各項目に、CSVのどの列を割り当てるか選んでください。</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="w-48 py-2 pr-4">JobDash の項目</th>
                  <th className="w-64 py-2 pr-4">CSV の列</th>
                  <th className="py-2">サンプル値</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TARGET_FIELDS.map((f) => (
                  <tr key={f.key}>
                    <td className="py-2 pr-4 align-top">
                      <div className="font-medium">
                        {f.label}
                        {f.required && <span className="ml-1 text-red-500">*</span>}
                      </div>
                      {f.hint && <div className="text-xs text-slate-400">{f.hint}</div>}
                    </td>
                    <td className="py-2 pr-4 align-top">
                      <select
                        value={mapping[f.key] ?? ''}
                        onChange={(e) => setColumn(f.key, e.target.value)}
                        className={`${selectClass} ${f.required && mapping[f.key] === null ? 'border-red-400' : ''}`}
                      >
                        <option value="">（取り込まない）</option>
                        {csv.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `列${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-0 truncate py-2 align-top text-slate-500" title={sample(mapping[f.key])}>
                      {sample(mapping[f.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(() => {
              const used = new Set(Object.values(mapping).filter((v) => v !== null));
              const unused = csv.headers.filter((_, i) => !used.has(i));
              return unused.length > 0 ? (
                <p className="mt-3 text-xs text-slate-500">取り込まれない列: {unused.map((h) => h || '(無名)').join(', ')}</p>
              ) : null;
            })()}
          </section>

          {/* Step 3: value mapping */}
          <section className={sectionClass}>
            <h2 className="mb-1 text-lg font-semibold">3. 値の対応付け</h2>
            <p className="mb-4 text-sm text-slate-500">
              CSVの値を JobDash の選択肢に対応付けます。表記ゆれ（空白・全角半角）は自動で判定しています。
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <EnumMappingTable
                title="選考フェーズ"
                columnMapped={mapping.phase !== null}
                rawValues={phaseRaw}
                counts={countBy(mapping.phase)}
                options={SELECTION_PHASES}
                value={phaseMap}
                onChange={(raw, v) => setPhaseOverrides((p) => ({ ...p, [raw]: v as SelectionPhase }))}
                defaultValue={defaults.phase}
                onDefaultChange={(v) => setDefaults((d) => ({ ...d, phase: v as SelectionPhase }))}
              />
              <EnumMappingTable
                title="アクション"
                columnMapped={mapping.action !== null}
                rawValues={actionRaw}
                counts={countBy(mapping.action)}
                options={ACTION_STATUSES}
                value={actionMap}
                onChange={(raw, v) => setActionOverrides((p) => ({ ...p, [raw]: v as ActionStatus }))}
                defaultValue={defaults.action}
                onDefaultChange={(v) => setDefaults((d) => ({ ...d, action: v as ActionStatus }))}
              />
            </div>

            {agentRaw.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-1 font-medium">担当エージェント（表示名）</h3>
                <p className="mb-2 text-xs text-slate-500">略称を正式名に置き換えられます。空欄ならCSVの値をそのまま使います。</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {agentRaw.map((raw) => (
                    <label key={raw} className="flex items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 truncate font-mono text-slate-600" title={raw}>
                        {raw}
                      </span>
                      <span className="text-slate-400">→</span>
                      <input
                        value={agentNames[raw] ?? ''}
                        placeholder={raw}
                        onChange={(e) => setAgentNames((p) => ({ ...p, [raw]: e.target.value }))}
                        className={selectClass}
                      />
                      <span className="shrink-0 text-xs text-slate-400">{countBy(mapping.agent).get(raw)}件</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Step 4: preview */}
          <section className={sectionClass}>
            <h2 className="mb-1 text-lg font-semibold">4. プレビューと取り込み</h2>
            <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span>
                取り込み対象 <strong className="text-blue-700">{toImport.length}</strong> / {converted.length} 行
              </span>
              {errorCount > 0 && <span className="text-red-600">エラー {errorCount} 行</span>}
              {duplicateCount > 0 && (
                <label className="flex items-center gap-2 text-amber-700">
                  <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                  既存と同名の企業 {duplicateCount} 行をスキップ
                </label>
              )}
              {mapping.companyName === null && <span className="text-red-600">「会社名」の列を割り当ててください</span>}
              {unmappedValues > 0 && <span className="text-red-600">対応先が未設定の値が {unmappedValues} 個あります</span>}
            </div>

            <div className="max-h-[32rem] overflow-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-3 py-2">取込</th>
                    <th className="px-3 py-2">行</th>
                    <th className="px-3 py-2">会社名</th>
                    <th className="px-3 py-2">エージェント</th>
                    <th className="px-3 py-2">フェーズ</th>
                    <th className="px-3 py-2">アクション</th>
                    <th className="px-3 py-2">次回アクション日時</th>
                    <th className="px-3 py-2">状態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {converted.map((r) => {
                    const included = isIncluded(r);
                    const selectable = r.errors.length === 0 && !(skipDuplicates && r.duplicate);
                    return (
                      <tr key={r.rowNumber} className={included ? '' : 'bg-slate-50 text-slate-400'}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={included}
                            disabled={!selectable}
                            onChange={() => toggleRow(r.rowNumber)}
                          />
                        </td>
                        <td className="px-3 py-2 tabular-nums">{r.rowNumber}</td>
                        <td className="px-3 py-2 font-medium">
                          {r.input.agentJobUrl ? (
                            <a href={r.input.agentJobUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {r.input.companyName || '(空)'}
                            </a>
                          ) : (
                            r.input.companyName || '(空)'
                          )}
                        </td>
                        <td className="px-3 py-2">{r.input.agent || '-'}</td>
                        <td className="px-3 py-2">
                          <PhaseBadge phase={r.input.phase} />
                        </td>
                        <td className="px-3 py-2">
                          <ActionBadge action={r.input.action} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                          {r.input.nextActionDate ? `${r.input.nextActionDate} ${r.input.nextActionTime ?? ''}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.errors.length > 0 ? (
                            <span className="text-red-600">{r.errors.join(' / ')}</span>
                          ) : r.duplicate ? (
                            <span className="text-amber-700">既存と同名</span>
                          ) : (
                            <span className="text-emerald-600">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {importError && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{importError}</p>}

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleImport}
                disabled={importing || toImport.length === 0 || mapping.companyName === null}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? 'インポート中...' : `${toImport.length} 件をインポート`}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EnumMappingTable({
  title,
  columnMapped,
  rawValues,
  counts,
  options,
  value,
  onChange,
  defaultValue,
  onDefaultChange,
}: {
  title: string;
  columnMapped: boolean;
  rawValues: string[];
  counts: Map<string, number>;
  options: readonly string[];
  value: Record<string, string>;
  onChange: (raw: string, v: string) => void;
  defaultValue: string;
  onDefaultChange: (v: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 font-medium">{title}</h3>
      {columnMapped && rawValues.length > 0 && (
        <table className="mb-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              <th className="py-1 pr-2">CSV の値</th>
              <th className="py-1 pr-2">件数</th>
              <th className="py-1">JobDash の値</th>
            </tr>
          </thead>
          <tbody>
            {rawValues.map((raw) => (
              <tr key={raw}>
                <td className="py-1 pr-2 font-mono text-slate-700">{raw}</td>
                <td className="py-1 pr-2 tabular-nums text-slate-500">{counts.get(raw)}</td>
                <td className="py-1">
                  <select
                    value={value[raw] ?? ''}
                    onChange={(e) => onChange(raw, e.target.value)}
                    className={`${selectClass} ${value[raw] ? '' : 'border-red-400 bg-red-50'}`}
                  >
                    <option value="" disabled>
                      選択してください
                    </option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span className="shrink-0">{columnMapped ? '空欄の場合' : '列が未割り当てのため全行'}:</span>
        <select value={defaultValue} onChange={(e) => onDefaultChange(e.target.value)} className={`${selectClass} w-auto`}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
