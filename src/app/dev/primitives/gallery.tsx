"use client";

import { useId, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Checkbox,
  MultiOptionGroup,
  OptionGroup,
  RadioGroup,
  ReadyBadge,
  Select,
  Slider,
  Switch,
  SwitchRow,
  TONE,
  buttonClass,
  choiceClass,
  cx,
  optionsFrom,
  type BadgeVariant,
  type ButtonVariant,
  type Size,
  type Tone,
} from "@/design";
import {
  DEFAULT_THEME,
  FONTS,
  themeCssVars,
  type FontKey,
  type ProjectTheme,
} from "@/lib/theme/project-theme";

/**
 * Palettes chosen to break things rather than to look good. `light` inverts the
 * ground, so a primitive that assumed a dark background shows it at once;
 * `low contrast` puts `dim` close to `paper`, so a state told apart only by
 * colour stops being told apart.
 */
const PRESETS: Record<string, { label: string; theme: Omit<ProjectTheme, "font"> }> = {
  nowadays: {
    label: "nowadays",
    theme: { void: DEFAULT_THEME.void, paper: DEFAULT_THEME.paper, dim: DEFAULT_THEME.dim },
  },
  light: {
    label: "light",
    theme: { void: "#f4f1ea", paper: "#1d1b18", dim: "#8a8478" },
  },
  ocean: {
    label: "ocean",
    theme: { void: "#0b1d2a", paper: "#d9f0ff", dim: "#5f7f99" },
  },
  lowContrast: {
    label: "low contrast",
    theme: { void: "#1a1a1a", paper: "#bdbdbd", dim: "#8f8f8f" },
  },
};

const VARIANTS: ButtonVariant[] = ["action", "plain", "quiet", "danger", "choice"];
const SIZES: Size[] = ["xs", "sm", "base"];
const TONES: Tone[] = ["neutral", "strong", "warning", "danger"];
const BADGE_VARIANTS: BadgeVariant[] = ["bare", "outlined"];

const SHAPES = [
  { value: "circle", label: "circle" },
  { value: "square", label: "square" },
  { value: "triangle", label: "triangle" },
];

const MOODS = [
  { value: "calm", label: "calm" },
  { value: "curious", label: "curious" },
  { value: "restless", label: "restless" },
  { value: "bright", label: "bright" },
];

const HUE_TRACK =
  "linear-gradient(to right, hsl(0 70% 60%), hsl(60 70% 60%), hsl(120 70% 60%), hsl(180 70% 60%), hsl(240 70% 60%), hsl(300 70% 60%), hsl(360 70% 60%))";

export default function PrimitivesGallery() {
  const [preset, setPreset] = useState("light");
  const [theme, setTheme] = useState<ProjectTheme>({
    ...PRESETS.light.theme,
    font: DEFAULT_THEME.font,
  });

  function pickPreset(key: string) {
    setPreset(key);
    setTheme((prev) => ({ ...PRESETS[key].theme, font: prev.font }));
  }

  function setColour(role: "void" | "paper" | "dim", value: string) {
    // A hand-picked colour is no longer any preset, so stop underlining one.
    setPreset("");
    setTheme((prev) => ({ ...prev, [role]: value }));
  }

  const projectStyle = {
    ...themeCssVars(theme),
    fontFamily: FONTS[theme.font].stack,
  } as CSSProperties;

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-void p-6 text-paper md:p-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-sm">Primitives</h1>
        <p className="max-w-prose text-xs text-dim">
          Every component exported from <code className="text-paper/70">@/design</code>, in every
          variant. The left column is an admin page: Geist, and the palette on{" "}
          <code className="text-paper/70">:root</code>. The right column sets a project&apos;s
          palette and typeface as CSS variables, the way <code className="text-paper/70">/e/[slug]</code>{" "}
          does. If a primitive looks wrong in only one of them, it has a colour or font hardcoded.
          Press Tab to move through the page and check the focus ring.
        </p>

        <div className="flex flex-col gap-3 border-t border-paper/10 pt-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-xs text-dim">palette</span>
            <OptionGroup
              label="Project palette"
              size="xs"
              options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))}
              value={preset}
              onChange={pickPreset}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {(["void", "paper", "dim"] as const).map((role) => (
              <label key={role} className="flex items-center gap-2 text-xs text-dim">
                {role}
                <input
                  type="color"
                  value={theme[role]}
                  onChange={(e) => setColour(role, e.target.value)}
                  className="h-5 w-8 cursor-pointer border border-paper/20 bg-transparent"
                />
                <span className="font-mono text-[11px]">{theme[role]}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs text-dim">
              font
              <Select
                size="xs"
                value={theme.font}
                onChange={(e) => setTheme((prev) => ({ ...prev, font: e.target.value as FontKey }))}
                options={optionsFrom(FONTS)}
                className="w-auto"
              />
            </label>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="admin" note="Geist · :root palette" className="font-sans">
          <Specimens />
        </Panel>
        <Panel
          title="project"
          note={`${FONTS[theme.font].label} · ${preset ? PRESETS[preset].label : "custom"}`}
          style={projectStyle}
        >
          <Specimens />
        </Panel>
      </div>
    </main>
  );
}

/**
 * One context. `bg-void` / `text-paper` are classes rather than inline colours
 * on purpose: with the palette set as variables on this element, the utilities
 * resolving to the tenant's values is itself part of what is being tested.
 */
function Panel({
  title,
  note,
  className,
  style,
  children,
}: {
  title: string;
  note: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      className={cx("flex min-w-0 flex-col gap-8 border border-paper/20 bg-void p-5 text-paper", className)}
      style={style}
    >
      <header className="flex items-baseline justify-between gap-4 border-b border-paper/10 pb-3">
        <h2 className="text-sm">{title}</h2>
        <span className="text-[11px] text-dim">{note}</span>
      </header>
      {children}
    </section>
  );
}

function Group({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs text-paper/60">{name}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/** A specimen with the props that produced it, so a look can be traced back to its call. */
function Row({ code, children }: { code: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[13rem_1fr]">
      <code className="truncate font-mono text-[10px] text-dim/80" title={code}>
        {code}
      </code>
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">{children}</div>
    </div>
  );
}

function Readout({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10px] text-dim/70">→ {children}</span>;
}

/**
 * Everything, once. Rendered by each panel with its own state, so poking the
 * admin copy does not move the project copy.
 */
function Specimens() {
  // Radios outside a form group by name across the whole document, so the two
  // panels need distinct names or picking in one would clear the other.
  const id = useId();

  const [pending, setPending] = useState(false);
  const [clicks, setClicks] = useState(0);

  const [select, setSelect] = useState("square");

  const [agreed, setAgreed] = useState(true);
  const [moods, setMoods] = useState<string[]>(["calm"]);

  const [shape, setShape] = useState("circle");
  const [segment, setSegment] = useState("square");

  const [on, setOn] = useState(true);
  const [rowOn, setRowOn] = useState(false);

  const [level, setLevel] = useState(40);
  const [hue, setHue] = useState(200);

  const [posted, setPosted] = useState<string | null>(null);

  function post(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const entries = [...new FormData(e.currentTarget).entries()].map(
      ([key, value]) => `${key}=${String(value)}`,
    );
    setPosted(entries.length ? entries.join("  ") : "(nothing)");
  }

  return (
    <>
      <Group name="Button">
        {VARIANTS.map((variant) => (
          <Row key={variant} code={`variant="${variant}"`}>
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size} onClick={() => setClicks((n) => n + 1)}>
                {variant} {size}
              </Button>
            ))}
            <Button variant={variant} disabled>
              disabled
            </Button>
          </Row>
        ))}
        <Row code="pending">
          <Button
            pending={pending}
            onClick={() => {
              setPending(true);
              setTimeout(() => setPending(false), 1500);
            }}
          >
            {pending ? "saving…" : "save"}
          </Button>
          <Readout>{clicks} click(s) above</Readout>
        </Row>
        <Row code="ButtonLink">
          <ButtonLink href="mailto:someone@example.com">mailto (quiet)</ButtonLink>
          <ButtonLink href="#" variant="action" onClick={(e) => e.preventDefault()}>
            action
          </ButtonLink>
          <ButtonLink href="#" variant="danger" onClick={(e) => e.preventDefault()}>
            danger
          </ButtonLink>
        </Row>
        <Row code="buttonClass() on <a>">
          <a href="#" className={buttonClass("quiet")} onClick={(e) => e.preventDefault()}>
            a quiet link
          </a>
        </Row>
        <Row code="choiceClass(active, locked)">
          <span className={choiceClass(true)}>active</span>
          <span className={choiceClass(false)}>inactive</span>
          <span className={choiceClass(false, true)}>locked</span>
        </Row>
      </Group>

      <Group name="Badge">
        {BADGE_VARIANTS.map((variant) => (
          <Row key={variant} code={`variant="${variant}"`}>
            {TONES.map((tone) => (
              <Badge key={tone} tone={tone} variant={variant}>
                {tone}
              </Badge>
            ))}
          </Row>
        ))}
        <Row code={'size="sm" variant="outlined"'}>
          <Badge size="sm" variant="outlined">
            v2 available
          </Badge>
          <Badge size="sm" tone="strong" variant="outlined">
            open
          </Badge>
        </Row>
        <Row code="ReadyBadge">
          <ReadyBadge ready>script uploaded</ReadyBadge>
          <ReadyBadge ready={false}>no parameters yet</ReadyBadge>
        </Row>
        <Row code="in a run of text">
          <span className="text-sm text-paper">
            members <Badge variant="outlined">owner</Badge> and <Badge tone="warning">pending</Badge>
          </span>
        </Row>
      </Group>

      <Group name="Select">
        {SIZES.map((size) => (
          <Row key={size} code={`size="${size}"`}>
            <Select
              size={size}
              options={SHAPES}
              value={select}
              onChange={(e) => setSelect(e.target.value)}
              className="max-w-48"
            />
            {size === "sm" && <Readout>{select}</Readout>}
          </Row>
        ))}
        <Row code="children + disabled option">
          <Select defaultValue="" className="max-w-48">
            <option value="" disabled>
              pick a role…
            </option>
            <optgroup label="people">
              <option value="owner">owner</option>
              <option value="editor">editor</option>
            </optgroup>
            <option value="viewer" disabled>
              viewer (soon)
            </option>
          </Select>
        </Row>
        <Row code="disabled">
          <Select disabled options={SHAPES} defaultValue="circle" className="max-w-48" />
        </Row>
      </Group>

      <Group name="Checkbox">
        <Row code="controlled">
          <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
            include text answers
          </Checkbox>
          <Readout>{String(agreed)}</Readout>
        </Row>
        <Row code="uncontrolled / disabled">
          <Checkbox defaultChecked={false}>unchecked</Checkbox>
          <Checkbox disabled>disabled</Checkbox>
          <Checkbox disabled defaultChecked>
            disabled + checked
          </Checkbox>
        </Row>
        <Row code={'size="sm" / "base"'}>
          <Checkbox size="sm" defaultChecked>
            sm
          </Checkbox>
          <Checkbox size="base">base</Checkbox>
        </Row>
      </Group>

      <Group name="MultiOptionGroup">
        <Row code="maxSelected={2}">
          <MultiOptionGroup label="Moods" options={MOODS} value={moods} onChange={setMoods} maxSelected={2} />
        </Row>
        <Row code="value">
          <Readout>[{moods.join(", ")}]</Readout>
        </Row>
        <Row code="disabled">
          <MultiOptionGroup label="Moods (disabled)" options={MOODS} value={["curious"]} onChange={() => {}} disabled />
        </Row>
      </Group>

      <Group name="Radio">
        <Row code="RadioGroup controlled">
          <RadioGroup
            label="Shape"
            name={`${id}-shape-controlled`}
            options={SHAPES}
            value={shape}
            onChange={setShape}
          />
          <Readout>{shape}</Readout>
        </Row>
        <Row code="showLegend + disabled option">
          <RadioGroup
            label="Shape"
            name={`${id}-shape-legend`}
            showLegend
            options={[...SHAPES.slice(0, 2), { ...SHAPES[2], disabled: true }]}
            defaultValue="square"
          />
        </Row>
        <Row code={'disabled · size="sm"'}>
          <RadioGroup label="Shape (disabled)" name={`${id}-shape-disabled`} options={SHAPES} defaultValue="circle" disabled />
          <RadioGroup label="Shape (sm)" name={`${id}-shape-sm`} options={SHAPES} defaultValue="triangle" size="sm" />
        </Row>
      </Group>

      <Group name="OptionGroup">
        {SIZES.map((size) => (
          <Row key={size} code={`size="${size}"`}>
            <OptionGroup label="Shape" options={SHAPES} value={segment} onChange={setSegment} size={size} />
          </Row>
        ))}
        <Row code="disabled">
          <OptionGroup label="Shape (disabled)" options={SHAPES} value="circle" onChange={() => {}} disabled />
        </Row>
      </Group>

      <Group name="Switch">
        <Row code="Switch">
          <Switch label="Glow" checked={on} onChange={setOn} />
          <Switch label="Glow (disabled)" checked={false} onChange={() => {}} disabled />
          <Switch label="Visible" checked={on} onChange={setOn} labels={{ on: "shown", off: "hidden" }} />
        </Row>
        <Row code="SwitchRow">
          <SwitchRow label="glow" checked={rowOn} onChange={setRowOn} />
        </Row>
      </Group>

      <Group name="Slider">
        <Row code="Slider">
          <Slider min={0} max={100} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          <Readout>{level}</Readout>
        </Row>
        <Row code="brackets">
          <Slider brackets min={0} max={100} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
        </Row>
        <Row code="track={hue ramp} brackets">
          <Slider
            brackets
            track={HUE_TRACK}
            min={0}
            max={360}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
          />
          <span aria-hidden className="inline-block h-3 w-3" style={{ backgroundColor: `hsl(${hue} 70% 60%)` }} />
        </Row>
        <Row code="disabled">
          <Slider disabled min={0} max={100} defaultValue={70} />
        </Row>
      </Group>

      <Group name="Tokens">
        <Row code="TONE">
          {TONES.map((tone) => (
            <span key={tone} className={cx("text-sm", TONE[tone])}>
              {tone}
            </span>
          ))}
        </Row>
        <Row code="palette roles">
          <span className="flex items-center gap-2 text-[11px] text-dim">
            <span className="inline-block h-4 w-4 border border-paper/20 bg-void" /> void
          </span>
          <span className="flex items-center gap-2 text-[11px] text-dim">
            <span className="inline-block h-4 w-4 bg-paper" /> paper
          </span>
          <span className="flex items-center gap-2 text-[11px] text-dim">
            <span className="inline-block h-4 w-4 bg-dim" /> dim
          </span>
        </Row>
      </Group>

      <Group name="In a form">
        <form onSubmit={post} className="flex flex-col gap-3">
          <p className="text-[11px] text-dim">
            What each control posts with no JavaScript doing the work — the path every admin form
            takes to its server action.
          </p>
          <Row code="name=…">
            <Checkbox name="intro" value="on" defaultChecked>
              intro
            </Checkbox>
            <Switch label="Open" name="open" checked={on} onChange={setOn} />
          </Row>
          <Row code="RadioGroup name=shape">
            <RadioGroup label="Shape" name="shape" options={SHAPES} defaultValue="circle" />
          </Row>
          <Row code="Select / Slider">
            <Select name="font" options={optionsFrom(FONTS)} defaultValue="dmMono" className="max-w-48" />
            <Slider name="level" min={0} max={10} defaultValue={5} />
          </Row>
          <Row code='type="submit"'>
            <Button type="submit">submit</Button>
            {posted && <Readout>{posted}</Readout>}
          </Row>
        </form>
      </Group>
    </>
  );
}
