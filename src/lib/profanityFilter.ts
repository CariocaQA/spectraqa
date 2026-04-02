// Lista de palavras proibidas (palavrões e termos ofensivos em português)
const FORBIDDEN_WORDS = [
  // Palavrões comuns
  'porra', 'caralho', 'merda', 'bosta', 'fodase', 'foda-se', 'fodasse',
  'puta', 'putaria', 'putinha', 'puto', 'arrombado', 'arrombada',
  'viado', 'viada', 'bicha', 'buceta', 'boceta', 'cu', 'cuzao', 'cuzão',
  'filho da puta', 'fdp', 'filhadaputa', 'desgraça', 'desgraçado', 'desgraçada',
  'otario', 'otário', 'otaria', 'otária', 'babaca', 'imbecil', 'idiota',
  'corno', 'corna', 'vagabundo', 'vagabunda', 'piranha', 'vadia', 'vadio',
  'cabaço', 'cacete', 'caceta', 'pau no cu', 'vai se fuder', 'vtnc',
  'vsf', 'pqp', 'tnc', 'krl', 'porrinha', 'foder', 'fodido', 'fodida',
  // Termos ofensivos
  'retardado', 'retardada', 'mongolóide', 'mongoloide', 'anormal',
  // Variações com números/símbolos comuns
  'c4ralho', 'p0rra', 'm3rda', 'b0st4',
];

// Normaliza texto removendo acentos e convertendo para minúsculas
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

export interface ProfanityCheckResult {
  hasProfanity: boolean;
  foundWords: string[];
}

export function checkProfanity(text: string): ProfanityCheckResult {
  const normalizedText = normalizeText(text);
  const foundWords: string[] = [];

  for (const word of FORBIDDEN_WORDS) {
    const normalizedWord = normalizeText(word);
    // Verifica se a palavra está presente como palavra inteira ou parte de palavras
    const regex = new RegExp(`\\b${normalizedWord}\\b|${normalizedWord}`, 'gi');
    if (regex.test(normalizedText)) {
      foundWords.push(word);
    }
  }

  return {
    hasProfanity: foundWords.length > 0,
    foundWords,
  };
}

export function containsProfanity(text: string): boolean {
  return checkProfanity(text).hasProfanity;
}
