import '../survey/survey.dart';

extension ThemisFormResult on SurveyFetchResult {
  String? get channel => extras?['channel'] as String?;
  String? get icon => extras?['icon'] as String?;

  /// Forms with a channel need E2E encryption (report flow).
  /// Forms without a channel use the survey flow (public/private split).
  bool get isEncryptedReport => channel != null;
}

extension ThemisListItem on SurveyListItem {
  String? get channel => extras?['channel'] as String?;
  String? get icon => extras?['icon'] as String?;
  bool get isEncryptedReport => channel != null;
}

extension ThemisSchema on SurveySchema {
  I18nString? get buttonLabel {
    final raw = metadata?['buttonLabel'];
    return raw != null ? I18nString.fromJson(raw) : null;
  }

  I18nString? get buttonDescription {
    final raw = metadata?['buttonDescription'];
    return raw != null ? I18nString.fromJson(raw) : null;
  }
}
