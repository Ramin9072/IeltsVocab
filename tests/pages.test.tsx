import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${to}` }); },
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  useRouter: () => ({ refresh() {}, push() {} }),
  usePathname: () => "/dashboard",
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }));

import { auth } from "@/auth";
import { closeTestRedis, useTestRedis } from "./helpers";
import { createUser } from "@/lib/users-repo";
import { requireUser } from "@/lib/session";
import { I18nProvider } from "@/components/i18n";
import { EmptyState } from "@/components/ui";
import { PracticeApp } from "@/components/practice-app";
import { CollectionsManager } from "@/components/collections-manager";
import { WordList } from "@/components/word-row";
import { makeT } from "@/lib/i18n";
import DashboardPage from "@/app/(app)/dashboard/page";
import LibraryPage from "@/app/(app)/library/page";
import ProgressPage from "@/app/(app)/progress/page";
import AppLayout from "@/app/(app)/layout";

beforeEach(async () => { await useTestRedis(); vi.mocked(auth).mockResolvedValue(null as never); });
afterAll(closeTestRedis);

const digest = async (p: Promise<unknown>) => ((await p.catch((e) => e)) as { digest?: string } | undefined)?.digest;

describe("protected pages", () => {
  it("redirect to /login when there is no session", async () => {
    expect(await digest(requireUser())).toContain("/login");
    expect(await digest(DashboardPage())).toContain("/login");
    expect(await digest(LibraryPage({ searchParams: Promise.resolve({}) }))).toContain("/login");
    expect(await digest(ProgressPage())).toContain("/login");
    expect(await digest(AppLayout({ children: null }))).toContain("/login");
  });

  it("redirect when the session points at an account that no longer exists", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "ghost" }, expires: "" } as never);
    expect(await digest(requireUser())).toContain("/login");
  });

  it("give a signed-in user their own record without the password hash", async () => {
    const u = await createUser({ email: "a@example.com", name: "Ava", password: "password123", timezone: "UTC" });
    vi.mocked(auth).mockResolvedValue({ user: { id: u.id }, expires: "" } as never);
    const got = await requireUser();
    expect(got).toMatchObject({ id: u.id, name: "Ava" });
    expect(got).not.toHaveProperty("passwordHash");
  });
});

const wrap = (lang: "en" | "fa", node: React.ReactNode) => renderToStaticMarkup(<I18nProvider lang={lang}>{node}</I18nProvider>);

describe("empty states", () => {
  it("renders a reusable empty state with a title, message and action", () => {
    const html = renderToStaticMarkup(<EmptyState title="Nothing here" body="Add something" action={<a href="/add">Add</a>} />);
    expect(html).toContain('data-testid="empty-state"');
    expect(html).toContain("Nothing here");
    expect(html).toContain('href="/add"');
  });

  it("practice explains what to do when the library is empty (English and Persian)", () => {
    const en = wrap("en", <PracticeApp collections={[]} totalWords={0} />);
    expect(en).toContain(makeT("en")("practice.nothing"));
    expect(en).toContain(makeT("en")("practice.fewWords"));
    expect(en).toContain('href="/add"');
    const fa = wrap("fa", <PracticeApp collections={[]} totalWords={0} />);
    expect(fa).toContain(makeT("fa")("practice.fewWords"));
  });

  it("collections shows an empty state with the create form", () => {
    const html = wrap("en", <CollectionsManager items={[]} />);
    expect(html).toContain(makeT("en")("col.emptyTitle"));
    expect(html).toContain(makeT("en")("col.new"));
  });

  it("new users see an invitation on the dashboard, library and progress pages", async () => {
    const u = await createUser({ email: "new@example.com", name: "Nia", password: "password123", timezone: "UTC" });
    vi.mocked(auth).mockResolvedValue({ user: { id: u.id }, expires: "" } as never);
    for (const page of [await DashboardPage(), await LibraryPage({ searchParams: Promise.resolve({}) }), await ProgressPage()]) {
      const html = wrap("en", page as React.ReactElement);
      expect(html).toContain('data-testid="empty-state"');
    }
  });

  it("a filter with no matches shows a different empty state than an empty library", async () => {
    const u = await createUser({ email: "f@example.com", name: "Fay", password: "password123", timezone: "UTC" });
    vi.mocked(auth).mockResolvedValue({ user: { id: u.id }, expires: "" } as never);
    const { addWord } = await import("./helpers");
    await addWord(u.id, "present");
    const html = wrap("en", (await LibraryPage({ searchParams: Promise.resolve({ q: "zzzz" }) })) as React.ReactElement);
    expect(html).toContain(makeT("en")("lib.noResultsTitle"));
    expect(html).not.toContain(makeT("en")("lib.emptyTitle"));
  });

  it("word lists render nothing but a list when empty (callers show their own message)", () => {
    expect(renderToStaticMarkup(<WordList items={[]} t={makeT("en")} />)).toBe('<ul class="divide-y divide-line"></ul>');
  });
});

describe("pronunciation practice screen", () => {
  it("is offered as a practice mode in both languages (the setup form renders on the server)", () => {
    for (const lang of ["en", "fa"] as const) {
      const html = wrap(lang, <PracticeApp collections={[]} totalWords={3} />);
      expect(html).toContain(makeT(lang)("practice.mode.speaking"));
      expect(html).toContain(makeT(lang)("practice.desc.speaking"));
    }
  });
});
