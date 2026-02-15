import type { SWIAnalysis } from '@/types/book';
import type { SuggestionChip } from '@/types/chat';

/**
 * Generate 3 context-aware suggestion chips based on the word's morphological structure.
 * Chips cover three SWI dimensions: morpheme, meaning/base, and word family.
 */
export function generateSuggestions(analysis: SWIAnalysis): SuggestionChip[] {
  const chips: SuggestionChip[] = [];
  const { word, matrix, relatives } = analysis;
  const bases = matrix.bases.map(b => b.text);
  const prefixes = matrix.prefixes.map(p => p.text);
  const suffixes = matrix.suffixes.map(s => s.text);

  // 1. Morpheme-focused question
  if (prefixes.length > 0) {
    const prefix = prefixes[0];
    chips.push({
      label: `What does "${prefix}-" do?`,
      query: `What does the prefix "${prefix}" do in the word "${word}"?`,
    });
  } else if (suffixes.length > 0) {
    const suffix = suffixes[0];
    chips.push({
      label: `Why "-${suffix}"?`,
      query: `Why does "${word}" end with the suffix "-${suffix}"?`,
    });
  } else {
    chips.push({
      label: `How is it built?`,
      query: `Can you help me understand how the word "${word}" is built from its parts?`,
    });
  }

  // 2. Meaning / base question
  if (bases.length > 0) {
    const base = bases[0];
    chips.push({
      label: `What does "${base}" mean?`,
      query: `What does the base "${base}" mean, and how does it give "${word}" its meaning?`,
    });
  } else {
    chips.push({
      label: `Why does it mean that?`,
      query: `Why does "${word}" mean what it means?`,
    });
  }

  // 3. Word family / connection question
  if (relatives.length > 0) {
    const relative = relatives[0];
    chips.push({
      label: `How is "${relative}" related?`,
      query: `How is the word "${relative}" related to "${word}"?`,
    });
  } else if (suffixes.length > 1) {
    const suffix = suffixes[1];
    chips.push({
      label: `What if I add "-${suffix}"?`,
      query: `What happens if I add the suffix "-${suffix}" to the base of "${word}"?`,
    });
  } else {
    chips.push({
      label: `Any words like this?`,
      query: `Can you help me think of other words that are built like "${word}"?`,
    });
  }

  return chips;
}
