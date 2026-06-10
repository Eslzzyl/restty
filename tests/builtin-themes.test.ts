import { expect, test } from "vitest";
import {
  getBuiltinTheme,
  getBuiltinThemeSource,
  isBuiltinThemeName,
  listBuiltinThemeNames,
} from "../src/index";

test("builtin theme catalog has unique names and valid sources", () => {
  const names = listBuiltinThemeNames();
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names).size).toBe(names.length);

  for (const name of names) {
    expect(isBuiltinThemeName(name)).toBe(true);
    const source = getBuiltinThemeSource(name);
    expect(source).toEqual(expect.any(String));
    expect(source!.length).toBeGreaterThan(0);
  }
});

test("builtin themes parse successfully", () => {
  const names = listBuiltinThemeNames();
  for (const name of names) {
    const theme = getBuiltinTheme(name);
    expect(theme).not.toBeNull();
    expect(theme?.colors.palette.length).toBe(256);
  }
});
