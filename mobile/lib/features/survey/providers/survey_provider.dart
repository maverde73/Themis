import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/survey/survey.dart';

import '../../../core/constants.dart';
import '../../form/providers/form_list_provider.dart';
import '../../pairing/providers/pairing_provider.dart';

/// Fetches active surveys for the paired organization.
final activeSurveysProvider =
    FutureProvider<List<SurveyListItem>>((ref) async {
  final pairingData = await ref.watch(pairingDataProvider.future);
  if (pairingData == null) return [];

  final tm = await ref.watch(tokenManagerProvider.future);
  final client = SurveyApiClient(baseUrl: apiBaseUrl, tokenManager: tm);
  return client.listActiveSurveys(pairingData.orgId);
});

/// Fetches a single survey schema by ID.
final surveyDetailProvider =
    FutureProvider.family<SurveyFetchResult, String>((ref, surveyId) async {
  final tm = await ref.watch(tokenManagerProvider.future);
  final client = SurveyApiClient(baseUrl: apiBaseUrl, tokenManager: tm);
  return client.fetchSurvey(surveyId);
});

/// Checks if the user has already responded to a survey on this device.
Future<bool> hasRespondedToSurvey(String surveyId) async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('survey_responded_$surveyId') ?? false;
}

/// Marks a survey as responded on this device.
Future<void> markSurveyResponded(String surveyId) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool('survey_responded_$surveyId', true);
}
