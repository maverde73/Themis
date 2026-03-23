import 'package:meta/meta.dart';

import 'i18n_string.dart';
import 'survey_question.dart';

@immutable
class SurveySchema {
  const SurveySchema({
    required this.title,
    this.description,
    required this.questions,
    this.metadata,
  });

  factory SurveySchema.fromJson(Map<String, dynamic> json) {
    const coreKeys = {'title', 'description', 'questions'};
    final extra = Map<String, dynamic>.from(json)
      ..removeWhere((k, _) => coreKeys.contains(k));
    return SurveySchema(
      title: I18nString.fromJson(json['title']),
      description: json['description'] != null
          ? I18nString.fromJson(json['description'])
          : null,
      questions: (json['questions'] as List<dynamic>)
          .map((e) => SurveyQuestion.fromJson(e as Map<String, dynamic>))
          .toList(),
      metadata: extra.isNotEmpty ? extra : null,
    );
  }

  final I18nString title;
  final I18nString? description;
  final List<SurveyQuestion> questions;
  final Map<String, dynamic>? metadata;

  Map<String, dynamic> toJson() => {
        'title': title.toJson(),
        if (description != null) 'description': description!.toJson(),
        if (metadata != null) ...metadata!,
        'questions': questions.map((q) => q.toJson()).toList(),
      };
}
