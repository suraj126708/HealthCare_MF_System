export const FREQUENCY_OPTIONS = [
  { code: "OD", label: "Once daily", perDay: 1 },
  { code: "BD", label: "Twice daily", perDay: 2 },
  { code: "TDS", label: "Three times daily", perDay: 3 },
  { code: "QID", label: "Four times daily", perDay: 4 },
];

export const INSTRUCTION_OPTIONS = [
  { value: "before_food", label: "Before food" },
  { value: "after_food", label: "After food" },
];

export function frequencyPerDayFromCode(code) {
  return FREQUENCY_OPTIONS.find((f) => f.code === code)?.perDay ?? 1;
}

export function frequencyLabel(code, frequencyPerDay) {
  const match = FREQUENCY_OPTIONS.find((f) => f.code === code);
  if (match) return match.label;
  if (frequencyPerDay) return `${frequencyPerDay} time(s) daily`;
  return "";
}

export function instructionLabel(value) {
  return INSTRUCTION_OPTIONS.find((i) => i.value === value)?.label || value || "";
}

export function formatPrescriptionLine(row) {
  const freq = frequencyLabel(row.frequency, row.frequencyPerDay);
  const instruction = instructionLabel(row.instruction);
  const parts = [
    row.drug,
    row.dosage,
    freq,
    row.durationDays ? `for ${row.durationDays} day(s)` : "",
    instruction,
  ].filter(Boolean);
  return parts.join(" • ");
}
