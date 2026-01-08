
import { findMatchesAPI, isAPIAvailable } from './apiService';

export interface Match {
  start: number;
  end: number;
  text: string;
  distance: number;
  strand: 'forward' | 'reverse';
}

export const cleanSequence = (sequence: string): string => {
  return sequence.toUpperCase().replace(/[^ACGT]/g, '');
};

export const calculateStats = (sequence: string) => {
  const clean = cleanSequence(sequence);
  const len = clean.length;
  const counts = { A: 0, T: 0, G: 0, C: 0 } as Record<string, number>;

  for (const base of clean) {
    if (counts[base] !== undefined) counts[base]++;
  }

  const gc = len > 0 ? ((counts.G + counts.C) / len * 100).toFixed(1) : '0';
  const ratio = len > 0
    ? `${counts.A}:${counts.T}:${counts.G}:${counts.C}`
    : '-';

  return {
    length: len,
    gcContent: gc,
    baseRatio: ratio,
    counts
  };
};

export const getComplement = (sequence: string): string => {
  const map: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
  return sequence.split('').map(b => map[b] || b).join('');
};

export const getReverseComplement = (sequence: string): string => {
  return getComplement(sequence).split('').reverse().join('');
};

const hammingDistance = (s1: string, s2: string): number => {
  if (s1.length !== s2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s1[i] !== s2[i]) dist++;
  }
  return dist;
};

export const findMatches = (
  sequence: string,
  pattern: string,
  type: string,
  maxMismatches: number = 0
): Match[] => {
  const matches: Match[] = [];
  if (!sequence || !pattern) return matches;

  // Normalize pattern to uppercase for case-insensitive matching
  const normalizedPattern = pattern.toUpperCase();

  // Simple regex conversion for non-regex types if needed?
  // The original code treated "regex" type specifically with RegExp object.
  // Others ("exact", "restriction", "motif") used the exact substring logic (if simple) or regex if complex chars were present.

  // Actually, the original code had a check:
  // if (!pattern.includes('|') && !pattern.includes('[') && !pattern.includes('*')) -> Exact Logic
  // else -> Regex Logic

  const isSimpleParams = !normalizedPattern.includes('|') && !normalizedPattern.includes('[') && !normalizedPattern.includes('*') && type !== 'regex';

  if (isSimpleParams) {
    // Exact substring matching with Hamming distance
    for (let i = 0; i <= sequence.length - normalizedPattern.length; i++) {
      const substr = sequence.substr(i, normalizedPattern.length);
      const dist = hammingDistance(normalizedPattern, substr);
      if (dist <= maxMismatches) {
        matches.push({
          start: i,
          end: i + normalizedPattern.length,
          text: substr,
          distance: dist,
          strand: 'forward'
        });
      }
    }
  } else {
    // Regex matching (ignores maxMismatches usually, unless we implement fuzzy regex, which is hard. Original code ignored mismatches for regex)
    try {
      // Adapt pattern for custom syntax if needed, but original assumed valid regex for "regex" type
      // or for motifs like "GC[AT]GC"
      const regex = new RegExp(normalizedPattern, 'gi');
      let match;
      while ((match = regex.exec(sequence)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          distance: 0,
          strand: 'forward'
        });
      }
    } catch (e) {
      console.error('Invalid regex:', e);
    }
  }

  return matches;
};

/**
 * Async version that tries C++ API first, falls back to local computation
 * This uses the C++ backend for better performance when available
 */
export const findMatchesAsync = async (
  sequence: string,
  pattern: string,
  type: string,
  maxMismatches: number = 0
): Promise<Match[]> => {
  if (!sequence || !pattern) return [];

  // Try C++ API first
  if (await isAPIAvailable()) {
    try {
      const result = await findMatchesAPI(
        cleanSequence(sequence),
        pattern,
        maxMismatches,
        true // search both strands
      );

      if (result.success && result.matches) {
        return result.matches.map(m => ({
          start: m.start,
          end: m.end,
          text: m.text,
          distance: m.distance,
          strand: m.strand
        }));
      }
    } catch (error) {
      console.warn('C++ API call failed, falling back to local:', error);
    }
  }

  // Fallback to local computation
  return findMatches(cleanSequence(sequence), pattern, type, maxMismatches);
};

export const EXAMPLE_DATA = [
  {
    name: 'Start Codon (ATG)',
    sequence: 'ATGCGATCGATCGATGCTAGCTAGATGCGATCGTAGCTAATGCGATCG',
    pattern: 'ATG',
    type: 'exact'
  },
  {
    name: 'EcoRI Restriction Site',
    sequence: 'ATCGATCGAATTCGATCGATCGAATTCGATCGATCGAATTCGATCG',
    pattern: 'GAATTC',
    type: 'restriction'
  },
  {
    name: 'Stop Codons (Regex)',
    sequence: 'ATGCGATCGATAACGATCGTAGGATCGTGACGATCGTAGCTA',
    pattern: 'TAA|TAG|TGA',
    type: 'regex'
  },
  {
    name: 'Any Codon (Regex)',
    sequence: 'ATGCCCGGGAAATTTCCCGGGAAATTTCCC',
    pattern: '[ACGT]{3}',
    type: 'regex'
  },
  {
    name: 'Purine Run (Regex)',
    sequence: 'AAGGAATTCCGGAAGGCCTTAAGGCC',
    pattern: '[AG]+',
    type: 'regex'
  },
  {
    name: 'GC-rich Region',
    sequence: 'ATATATGCGCGCGCATATGCGCGCATATAT',
    pattern: '[GC]{4,}',
    type: 'regex'
  },
  {
    name: 'Kozak Sequence',
    sequence: 'GCCGCCACCATGGCGTTTAAAGCCGCCACCATGAAA',
    pattern: 'GCC[AG]CCATG',
    type: 'regex'
  },
  {
    name: 'TATA Box Motif',
    sequence: 'GCGCGCTATAAAAAGCGCGCTATAAATGCGCGC',
    pattern: 'TATAA+',
    type: 'regex'
  }
];
