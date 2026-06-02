import postcss, { type Container } from 'postcss';

export interface ValueDiff {
  selector: string;
  prop: string;
  a: string;
  b: string;
  /** 'rem-px' when a is the b value expressed in rem at 16px/rem; else 'other'. */
  kind: 'rem-px' | 'other';
}

export interface CssDiff {
  onlyInA: string[];
  onlyInB: string[];
  valueDiffs: ValueDiff[];
}

type Index = Map<string, Map<string, string>>;

const REM_RE = /(-?[\d.]+)rem\b/g;
const remToPx = (v: string) => v.replace(REM_RE, (_m, n: string) => `${parseFloat(n) * 16}px`);
const norm = (v: string) => v.replace(/\s+/g, ' ').trim();

/** Index declarations by "<atrule-context> :: <selector>" (or bare selector),
 * prop → value, later declarations win (cascade within an equal-specificity sheet). */
function indexCss(css: string): Index {
  const root = postcss.parse(css);
  const index: Index = new Map();
  root.walkRules((rule) => {
    const contexts: string[] = [];
    let parent: Container | undefined = rule.parent;
    while (parent && parent.type === 'atrule') {
      const at = parent as unknown as { name: string; params: string };
      contexts.unshift(`@${at.name} (${norm(at.params).replace(/^\(|\)$/g, '')})`);
      parent = parent.parent as Container | undefined;
    }
    for (const selector of rule.selectors ?? [rule.selector]) {
      const key = contexts.length ? `${contexts.join(' ')} :: ${norm(selector)}` : norm(selector);
      const decls = index.get(key) ?? new Map<string, string>();
      rule.walkDecls((decl) => {
        if (decl.parent === rule) decls.set(decl.prop, norm(decl.value));
      });
      index.set(key, decls);
    }
  });
  return index;
}

export function diffCss(a: string, b: string): CssDiff {
  const ia = indexCss(a);
  const ib = indexCss(b);
  const onlyInA = [...ia.keys()].filter((k) => !ib.has(k)).sort();
  const onlyInB = [...ib.keys()].filter((k) => !ia.has(k)).sort();
  const valueDiffs: ValueDiff[] = [];
  for (const [selector, declsA] of ia) {
    const declsB = ib.get(selector);
    if (!declsB) continue;
    for (const [prop, va] of declsA) {
      const vb = declsB.get(prop);
      if (vb === undefined || vb === va) continue;
      valueDiffs.push({
        selector,
        prop,
        a: va,
        b: vb,
        kind: remToPx(va) === vb ? 'rem-px' : 'other',
      });
    }
  }
  return { onlyInA, onlyInB, valueDiffs };
}
