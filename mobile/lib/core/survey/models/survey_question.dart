import 'package:meta/meta.dart';

import 'branch_condition.dart';
import 'i18n_option.dart';
import 'i18n_string.dart';
import 'question_type.dart';

@immutable
class SurveyQuestion {
  const SurveyQuestion({
    required this.id,
    required this.type,
    required this.label,
    this.description,
    this.required = false,
    this.private = false,
    this.options,
    this.statements,
    this.min,
    this.max,
    this.minLabel,
    this.maxLabel,
    this.showIf,
  });

  factory SurveyQuestion.fromJson(Map<String, dynamic> json) {
    return SurveyQuestion(
      id: json['id'] as String,
      type: QuestionType.fromJson(json['type'] as String),
      label: I18nString.fromJson(json['label']),
      description: json['description'] != null
          ? I18nString.fromJson(json['description'])
          : null,
      required: json['required'] as bool? ?? false,
      private: json['private'] as bool? ?? false,
      options: (json['options'] as List<dynamic>?)
          ?.map((e) => I18nOption.fromJson(e))
          .toList(),
      statements: (json['statements'] as List<dynamic>?)
          ?.map((e) => I18nOption.fromJson(e))
          .toList(),
      min: (json['min'] as num?)?.toInt(),
      max: (json['max'] as num?)?.toInt(),
      minLabel: json['minLabel'] != null
          ? I18nString.fromJson(json['minLabel'])
          : null,
      maxLabel: json['maxLabel'] != null
          ? I18nString.fromJson(json['maxLabel'])
          : null,
      showIf: json['showIf'] != null
          ? BranchCondition.fromJson(json['showIf'] as Map<String, dynamic>)
          : null,
    );
  }

  final String id;
  final QuestionType type;
  final I18nString label;
  final I18nString? description;
  final bool required;
  final bool private;
  final List<I18nOption>? options;
  final List<I18nOption>? statements;
  final int? min;
  final int? max;
  final I18nString? minLabel;
  final I18nString? maxLabel;
  final BranchCondition? showIf;

  /// Returns the option values as plain strings (for branching / validation).
  List<String>? get optionValues => options?.map((o) => o.value).toList();

  /// Returns the statement values as plain strings (for Likert keys).
  List<String>? get statementValues =>
      statements?.map((s) => s.value).toList();

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'id': id,
      'type': type.toJson(),
      'label': label.toJson(),
    };
    if (description != null) json['description'] = description!.toJson();
    if (required) json['required'] = required;
    if (private) json['private'] = private;
    if (options != null) {
      json['options'] = options!.map((o) => o.toJson()).toList();
    }
    if (statements != null) {
      json['statements'] = statements!.map((s) => s.toJson()).toList();
    }
    if (min != null) json['min'] = min;
    if (max != null) json['max'] = max;
    if (minLabel != null) json['minLabel'] = minLabel!.toJson();
    if (maxLabel != null) json['maxLabel'] = maxLabel!.toJson();
    if (showIf != null) json['showIf'] = showIf!.toJson();
    return json;
  }
}
