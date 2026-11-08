'use client';

import { SLOT_FORMAT_PRESETS, formatSlots, type TimeSlot } from '@jobdash/shared';
import CopyButton from '@/components/ui/CopyButton';
import { inputClass } from '@/components/ui/styles';
import { usePersistentState } from '@/lib/usePersistentState';

const CUSTOM = 'custom';

interface FormatSettings {
  presetId: string; // a preset id or "custom"
  customTemplate: string;
  bullet: string; // prefix of each line, e.g. "・"
}

const DEFAULT_SETTINGS: FormatSettings = {
  presetId: SLOT_FORMAT_PRESETS[0].id,
  customTemplate: SLOT_FORMAT_PRESETS[0].template,
  bullet: '',
};

/** Plain-text list of preferred slots for sending to the agent, with a selectable format. */
export default function SlotTextExport({ slots }: { slots: TimeSlot[] }) {
  const [settings, setSettings] = usePersistentState<FormatSettings>('jobdash.slotFormat', DEFAULT_SETTINGS);
  const preset = SLOT_FORMAT_PRESETS.find((p) => p.id === settings.presetId);
  const template = preset?.template ?? settings.customTemplate;
  const text = formatSlots(slots, template, settings.bullet);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="書式"
          value={preset ? preset.id : CUSTOM}
          onChange={(e) => setSettings((s) => ({ ...s, presetId: e.target.value }))}
          className={`${inputClass} w-auto flex-1`}
        >
          {SLOT_FORMAT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
          <option value={CUSTOM}>カスタム</option>
        </select>
        <select
          aria-label="行頭記号"
          value={settings.bullet}
          onChange={(e) => setSettings((s) => ({ ...s, bullet: e.target.value }))}
          className={`${inputClass} w-auto`}
        >
          <option value="">行頭なし</option>
          <option value="・">・</option>
          <option value="- ">-</option>
          <option value="■">■</option>
        </select>
      </div>
      {!preset && (
        <div>
          <input
            value={settings.customTemplate}
            onChange={(e) => setSettings((s) => ({ ...s, customTemplate: e.target.value }))}
            className={`${inputClass} font-mono`}
          />
          <p className="mt-1 text-xs text-slate-500">
            使える記号: {'{年} {月} {日} {曜} {開始} {終了} {終了日}'}（{'{終了日}'} は日をまたぐ場合のみ出力）
          </p>
        </div>
      )}
      <textarea
        readOnly
        rows={Math.min(Math.max(slots.length, 3), 10)}
        value={text}
        placeholder="希望日時がありません"
        className={`${inputClass} font-mono text-xs`}
      />
      <div className="flex justify-end">
        <CopyButton text={text} />
      </div>
    </div>
  );
}
