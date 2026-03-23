import 'package:meta/meta.dart';

/// A string that supports multiple translations keyed by locale.
///
/// Accepts both a plain [String] and a `Map<String, String>` from JSON
/// for backwards compatibility.
@immutable
class I18nString {
  const I18nString(this.translations);

  /// Creates an [I18nString] wrapping a single untranslated string
  /// stored under the `'_'` key.
  I18nString.plain(String value) : translations = {'_': value};

  /// Accepts either a plain [String] or a `Map<String, String>`.
  factory I18nString.fromJson(dynamic json) {
    if (json is String) {
      return I18nString({'_': json});
    }
    if (json is Map) {
      return I18nString(
        json.map((k, v) => MapEntry(k.toString(), v.toString())),
      );
    }
    throw FormatException('I18nString: expected String or Map, got ${json.runtimeType}');
  }

  final Map<String, String> translations;

  /// Resolves the best translation for the given [locale].
  ///
  /// Fallback chain: exact locale → language part → `en` → `it` → first value.
  String resolve([String? locale]) {
    // Single plain string (no locale keys)
    if (translations.containsKey('_')) return translations['_']!;

    if (locale != null) {
      // Exact match (e.g. 'it_IT')
      if (translations.containsKey(locale)) return translations[locale]!;
      // Language part (e.g. 'it' from 'it_IT')
      final lang = locale.split('_').first.split('-').first;
      if (translations.containsKey(lang)) return translations[lang]!;
    }

    // Fallback chain
    if (translations.containsKey('en')) return translations['en']!;
    if (translations.containsKey('it')) return translations['it']!;

    return translations.values.first;
  }

  /// Serializes always as a Map (i18n format).
  /// Plain strings are written as `{"_": "value"}` only if truly untranslated.
  dynamic toJson() {
    if (translations.length == 1 && translations.containsKey('_')) {
      return translations['_'];
    }
    return translations;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is I18nString &&
          other.translations.length == translations.length &&
          other.translations.entries.every(
            (e) => translations[e.key] == e.value,
          );

  @override
  int get hashCode => Object.hashAll(
        translations.entries.map((e) => Object.hash(e.key, e.value)),
      );

  @override
  String toString() => resolve();
}
