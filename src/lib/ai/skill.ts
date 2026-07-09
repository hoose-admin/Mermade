/**
 * The AI "skill": the instruction context Mermade sends to the model.
 *
 * This is intentionally a plain, well-labelled module rather than one opaque
 * prompt string so it can grow over time. The final system prompt is composed
 * from four layers, in order of precedence:
 *
 *   1. ROLE          — who the assistant is (rarely changes).
 *   2. GLOBAL_RULES  — hard rules that hold for every diagram.
 *   3. TYPE_TIPS     — guidance specific to the diagram currently on screen,
 *                      selected from the parser's detected diagram type.
 *   4. context       — the user's per-diagram "AI Context" (the editor tab,
 *                      stored in `State.aiContext`), appended last so it can
 *                      describe or override anything for this specific diagram.
 *
 * Layers 1–3 are the invisible base prompt (this file, edited in code). Layer 4
 * is the only user-facing context surface. To teach the assistant something new
 * across all diagrams, add a rule here or a bullet under the relevant TYPE_TIPS
 * entry — no call-site changes required.
 */

export const ROLE =
  'You are an AI assistant embedded in a live Mermaid diagram editor. The user gives an instruction to create or modify the current Mermaid diagram, and your output is rendered immediately.';

export const GLOBAL_RULES = `Mermaid supports flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, mindmap, gitGraph, journey, quadrantChart, timeline, C4 and more.

Rules:
- Return the COMPLETE, valid Mermaid source for the whole diagram after applying the instruction — never a diff or a partial snippet.
- Keep the user's existing diagram intact and change only what the instruction asks, unless they clearly want to start over.
- Preserve the existing diagram type unless the user explicitly asks to change it.
- The code must be syntactically valid Mermaid that renders without errors. Do not include Markdown code fences.
- CRITICAL: any label text containing special characters — parentheses ( ), square brackets, braces, quotes, commas, colons, #, <, >, or a leading number — MUST be wrapped in double quotes. E.g. write \`A["Simulation (FDTD, mode)"]\`, never \`A[Simulation (FDTD, mode)]\`. Unquoted brackets/parens inside a label break the parser.
- Also give a very short (one sentence, plain-language) summary of what you changed.`;

/**
 * Per-diagram-type guidance, keyed by the canonical type from
 * `normalizeDiagramType`. Add or refine entries freely; unknown types simply
 * contribute no extra guidance.
 */
export const TYPE_TIPS: Record<string, string> = {
  flowchart: `This is a flowchart. Node ids come before their bracket label, e.g. \`A[Label]\`, \`B(Rounded)\`, \`C{Decision}\`. Edges: \`A --> B\`, labelled \`A -->|text| B\`. Use \`subgraph Name ... end\` to group. Keep node ids stable when editing so existing edges keep working. Quote any label containing parentheses, commas, or other special characters: \`A["Simulation (FDTD, mode)"]\`, not \`A[Simulation (FDTD, mode)]\`.`,
  sequenceDiagram: `This is a sequence diagram. Declare participants with \`participant A\` (or \`actor A\`). Messages: \`A->>B: text\` (solid arrow), \`A-->>B: text\` (dashed reply). Use \`activate\`/\`deactivate\` or \`A->>+B\`/\`B-->>-A\` for lifelines, and \`loop\`/\`alt\`/\`opt\`/\`par ... end\` blocks for control flow.`,
  classDiagram: `This is a class diagram. Define members inside \`class Name { +field: Type; +method() }\`. Relationships: \`A <|-- B\` (inheritance), \`A *-- B\` (composition), \`A o-- B\` (aggregation), \`A --> B\` (association). Visibility prefixes: + public, - private, # protected.`,
  stateDiagram: `This is a state diagram (stateDiagram-v2). Use \`[*] --> State\` for the start and \`State --> [*]\` for the end. Transitions: \`A --> B: event\`. Nest with \`state Name { ... }\` and use \`state fork <<fork>>\` / \`<<choice>>\` for branching.`,
  erDiagram: `This is an entity-relationship diagram. Relationships use crow's-foot cardinality, e.g. \`CUSTOMER ||--o{ ORDER : places\`. Attribute blocks: \`ENTITY { type name PK }\`. Keep entity names UPPER_CASE by convention.`,
  gantt: `This is a Gantt chart. Set \`dateFormat\` and \`title\`, group tasks under \`section Name\`. Tasks: \`Task name :id, 2024-01-01, 3d\` or \`:after id, 2d\`. Use \`done\`, \`active\`, \`crit\`, \`milestone\` tags before the id.`,
  pie: `This is a pie chart. After an optional \`title\`, each slice is \`"Label" : value\`. Values are numbers; Mermaid computes the percentages.`,
  mindmap: `This is a mindmap. Structure is defined purely by indentation under a single root. Node shapes: \`id[square]\`, \`id(rounded)\`, \`id((circle))\`. Do not add edges — hierarchy comes from indentation only.`,
  gitGraph: `This is a gitGraph. Use \`commit\`, \`branch name\`, \`checkout name\`, \`merge name\`. Optionally tag commits with \`commit id: "msg" tag: "v1"\`.`,
  journey: `This is a user journey. Group steps under \`section Name\`. Each task is \`Task name: <score 1-5>: Actor1, Actor2\`.`,
  timeline: `This is a timeline. After an optional \`title\`, each period is \`Period : event : event\`. Multiple events under one period are separated by colons or listed on indented lines.`,
  quadrantChart: `This is a quadrant chart. Define \`x-axis\`, \`y-axis\`, and the four \`quadrant-1..4\` labels, then plot points as \`Label: [x, y]\` with x and y in 0..1.`
};

/**
 * Map the parser's raw diagram type (which varies, e.g. `flowchart-v2`,
 * `graph`, `class`, `stateDiagram`) onto a stable key used by TYPE_TIPS.
 */
export const normalizeDiagramType = (raw?: string): string => {
  if (!raw) {
    return '';
  }
  const t = raw.trim();
  if (/^(flowchart|graph)/i.test(t)) {
    return 'flowchart';
  }
  if (/^sequence/i.test(t)) {
    return 'sequenceDiagram';
  }
  if (/^class/i.test(t)) {
    return 'classDiagram';
  }
  if (/^state/i.test(t)) {
    return 'stateDiagram';
  }
  if (/^er/i.test(t)) {
    return 'erDiagram';
  }
  if (/^git/i.test(t)) {
    return 'gitGraph';
  }
  if (/^(quadrant)/i.test(t)) {
    return 'quadrantChart';
  }
  // gantt, pie, mindmap, journey, timeline already match their TYPE_TIPS key.
  return t;
};

export interface SkillContext {
  /** Raw diagram type from the parser (`validatedState.current.diagramType`). */
  diagramType?: string;
  /** The user's per-diagram "AI Context" tab content (`State.aiContext`). */
  context?: string;
}

/** Compose the full system prompt from the skill layers for one request. */
export const buildSystemPrompt = ({ diagramType, context }: SkillContext = {}): string => {
  const sections = [ROLE, GLOBAL_RULES];

  const tip = TYPE_TIPS[normalizeDiagramType(diagramType)];
  if (tip) {
    sections.push(`Guidance for the current diagram:\n${tip}`);
  }

  const userContext = context?.trim();
  if (userContext) {
    // The user's text is passed through verbatim, bounded by explicit tags so the
    // model treats it as a self-contained block rather than as more instructions.
    sections.push(
      `The user has provided the following context about the current diagram and how they want it edited, inside the <user_diagram_context> tags below. Treat it as authoritative background and follow any preferences in it unless a specific instruction overrides them.\n\n<user_diagram_context>\n${userContext}\n</user_diagram_context>`
    );
  }

  return sections.join('\n\n');
};
