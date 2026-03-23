import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/token_manager.dart';
import '../../../core/survey/survey.dart';

import '../../../core/constants.dart';
import '../../pairing/providers/pairing_provider.dart';

/// Provides a TokenManager once pairing data is available.
final tokenManagerProvider = FutureProvider<TokenManager?>((ref) async {
  final pairingData = await ref.watch(pairingDataProvider.future);
  if (pairingData == null || pairingData.pairingSecret == null) return null;
  return TokenManager(pairingData: pairingData);
});

final formApiClientProvider = Provider<SurveyApiClient>((ref) {
  final tmAsync = ref.watch(tokenManagerProvider);
  final tm = tmAsync.valueOrNull;
  return SurveyApiClient(baseUrl: apiBaseUrl, tokenManager: tm);
});

/// Fetches all active forms (surveys + reports) for the paired organization.
final activeFormsProvider =
    FutureProvider<List<SurveyListItem>>((ref) async {
  final pairingData = await ref.watch(pairingDataProvider.future);
  if (pairingData == null) return [];

  // Ensure token manager is ready before making API calls
  final tm = await ref.watch(tokenManagerProvider.future);
  final client = SurveyApiClient(baseUrl: apiBaseUrl, tokenManager: tm);
  return client.listActiveSurveys(pairingData.orgId);
});
