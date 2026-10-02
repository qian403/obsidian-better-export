import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMessage, getTranslations, isLanguageSetting, locales, resolveLocale } from "../src/i18n";

for (const [alias, expected] of Object.entries({ en: "en", "en-US": "en", zh: "zh", "zh-CN": "zh",
  "zh-SG": "zh", "zh-Hans": "zh", "zh-TW": "zh-TW", "zh_HK": "zh-TW", "zh-MO": "zh-TW",
  "zh-Hant-TW": "zh-TW", "zh-Hans-HK": "zh", " ZH_tw ": "zh-TW", ja: "en", "": "en", toString: "en" })) {
  test(`locale alias ${alias}`, () => assert.equal(resolveLocale(alias), expected));
}
test("language override and automatic fallback", () => {
  assert.equal(getTranslations("zh-TW", "en"), locales["zh-TW"]);
  assert.equal(getTranslations("auto", "zh-HK"), locales["zh-TW"]);
  assert.equal(getTranslations("auto", "fr"), locales.en);
  assert.equal(getTranslations("auto", null), locales.en);
  assert.equal(getTranslations("auto", "zh"), getTranslations("auto", "zh"));
});
test("all translations have matching keys, placeholders, and nonempty values", () => {
  const leaves = (obj: object, prefix = ""): Record<string, string> => Object.assign({}, ...Object.entries(obj)
    .map(([key, value]) => typeof value === "string" ? { [prefix + key]: value } : leaves(value, prefix + key + ".")));
  const english = leaves(locales.en);
  for (const dictionary of Object.values(locales)) {
    const translated = leaves(dictionary);
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(english).sort());
    for (const [key, text] of Object.entries(translated)) {
      assert.ok(text.trim(), key);
      assert.deepEqual(text.match(/\{\w+\}/g), english[key].match(/\{\w+\}/g), key);
    }
  }
});
test("saved language excludes prototype properties", () => {
  for (const value of ["en", "zh", "zh-TW", "auto"]) assert.ok(isLanguageSetting(value));
  for (const value of ["__proto__", "constructor", "toString", null, 1, "zh_HK"]) assert.equal(isLanguageSetting(value), false);
});
test("message interpolation preserves unknown placeholders and literal replacement text", () => {
  assert.equal(formatMessage("{error} / {unknown}", { error: "$& <問題>" }), "$& <問題> / {unknown}");
});
