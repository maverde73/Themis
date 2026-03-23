import 'package:meta/meta.dart';

import 'i18n_string.dart';

/// An option for choice/multi_choice/ranking questions that separates
/// the stable value (saved in responses) from the i18n display label.
@immutable
class I18nOption {
  const I18nOption({required this.value, required this.label});

  /// Accepts either a plain [String] (backwards compat: value == label)
  /// or a `{ "value": "...", "label": { ... } }` map.
  factory I18nOption.fromJson(dynamic json) {
    if (json is String) {
      return I18nOption(
        value: json,
        label: I18nString.plain(json),
      );
    }
    if (json is Map) {
      return I18nOption(
        value: json['value'] as String,
        label: I18nString.fromJson(json['label']),
      );
    }
    throw FormatException(
        'I18nOption: expected String or Map, got ${json.runtimeType}');
  }

  final String value;
  final I18nString label;

  dynamic toJson() => {
        'value': value,
        'label': label.toJson(),
      };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is I18nOption && other.value == value && other.label == label;

  @override
  int get hashCode => Object.hash(value, label);

  @override
  String toString() => value;
}
