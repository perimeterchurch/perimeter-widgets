/** Canonical Bible book order (1-based, Genesis=1 through Revelation=66) */
const BIBLE_BOOK_ORDER: Record<string, number> = {
  Genesis: 1,
  Exodus: 2,
  Leviticus: 3,
  Numbers: 4,
  Deuteronomy: 5,
  Joshua: 6,
  Judges: 7,
  Ruth: 8,
  '1 Samuel': 9,
  '2 Samuel': 10,
  '1 Kings': 11,
  '2 Kings': 12,
  '1 Chronicles': 13,
  '2 Chronicles': 14,
  Ezra: 15,
  Nehemiah: 16,
  Esther: 17,
  Job: 18,
  Psalms: 19,
  Proverbs: 20,
  Ecclesiastes: 21,
  'Song of Solomon': 22,
  Isaiah: 23,
  Jeremiah: 24,
  Lamentations: 25,
  Ezekiel: 26,
  Daniel: 27,
  Hosea: 28,
  Joel: 29,
  Amos: 30,
  Obadiah: 31,
  Jonah: 32,
  Micah: 33,
  Nahum: 34,
  Habakkuk: 35,
  Zephaniah: 36,
  Haggai: 37,
  Zechariah: 38,
  Malachi: 39,
  Matthew: 40,
  Mark: 41,
  Luke: 42,
  John: 43,
  Acts: 44,
  Romans: 45,
  '1 Corinthians': 46,
  '2 Corinthians': 47,
  Galatians: 48,
  Ephesians: 49,
  Philippians: 50,
  Colossians: 51,
  '1 Thessalonians': 52,
  '2 Thessalonians': 53,
  '1 Timothy': 54,
  '2 Timothy': 55,
  Titus: 56,
  Philemon: 57,
  Hebrews: 58,
  James: 59,
  '1 Peter': 60,
  '2 Peter': 61,
  '1 John': 62,
  '2 John': 63,
  '3 John': 64,
  Jude: 65,
  Revelation: 66,
};

const OT_LAST = 39; // Malachi

export interface BookOption {
  value: string;
  label: string;
}

export interface BookGroup {
  label: string;
  options: BookOption[];
}

/**
 * Sort books in canonical Bible order and group into Old/New Testament.
 * Books not found in the canonical list are appended at the end.
 */
export function groupBooksByTestament(books: { id: number; name: string }[]): BookGroup[] {
  const sorted = [...books].sort((a, b) => {
    const orderA = BIBLE_BOOK_ORDER[a.name] ?? 999;
    const orderB = BIBLE_BOOK_ORDER[b.name] ?? 999;
    return orderA - orderB;
  });

  const ot: BookOption[] = [];
  const nt: BookOption[] = [];

  for (const book of sorted) {
    const order = BIBLE_BOOK_ORDER[book.name] ?? 999;
    const option = { value: String(book.id), label: book.name };
    if (order <= OT_LAST) {
      ot.push(option);
    } else {
      nt.push(option);
    }
  }

  const groups: BookGroup[] = [];
  if (ot.length > 0) groups.push({ label: 'Old Testament', options: ot });
  if (nt.length > 0) groups.push({ label: 'New Testament', options: nt });
  return groups;
}
