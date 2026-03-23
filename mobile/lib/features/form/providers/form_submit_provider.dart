import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:styx_crypto_core/styx_crypto_core.dart';
import '../../../core/survey/survey.dart';

import '../../../core/constants.dart';
import '../../../core/models/form_extensions.dart';
import '../../../core/crypto/report_encryptor.dart';
import '../../../core/network/api_client.dart';
import '../../../core/styx/styx_provider.dart';
import '../../pairing/providers/pairing_provider.dart';
import 'form_list_provider.dart';

/// Handles unified form submission for both surveys and reports.
///
/// - channel != null (encrypted report): encrypts payload E2E, sends via Styx, posts only metadata to server
/// - channel == null (survey): partitions public/private, sends public to server, encrypts private via Styx
class FormSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> submit({
    required SurveyFetchResult form,
    required SurveySubmission submission,
  }) async {
    state = const AsyncLoading();
    try {
      if (form.isEncryptedReport) {
        await _submitReport(form, submission);
      } else {
        await _submitSurvey(form, submission);
      }
      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
    }
  }

  Future<void> _submitReport(
    SurveyFetchResult form,
    SurveySubmission submission,
  ) async {
    final keyStore = ref.read(keyStoreProvider);
    final pairingData = await keyStore.getPairingData();
    final keyPair = await keyStore.getKeyPair();

    if (pairingData == null || keyPair == null) {
      throw StateError('Not paired — cannot send report');
    }

    // Determine recipient public key based on channel
    final pubKeyHex = form.channel == 'PDR125'
        ? pairingData.rpgPublicKey
        : pairingData.odvPublicKey;

    final recipientPubKey = StyxPublicKey(_hexToBytes(pubKeyHex));
    final encryptor = ReportEncryptor();

    // Encrypt ONLY private answers E2E (descriptions, names, contacts)
    // Public answers (categories, choices) go to server for aggregation
    final envelope = await encryptor.encrypt(
      payload: submission.privateAnswers,
      recipientEd25519PublicKey: recipientPubKey,
      senderPrivateKey: keyPair.privateKey,
      senderPublicKey: keyPair.publicKey,
    );

    // Send encrypted private answers to relay via Styx
    final styx = ref.read(styxServiceProvider);
    if (!styx.isInitialized) await styx.initialize();
    await styx.sendEncrypted(
      channel: form.channel ?? 'PDR125',
      payload: {
        'type': form.channel == 'WHISTLEBLOWING'
            ? 'segnalazione_wb'
            : 'segnalazione_pdr125',
        'formId': form.id,
        'envelope': envelope.toJson(),
      },
    );

    // Post metadata + public answers to server for analytics
    final tm = await ref.read(tokenManagerProvider.future);
    final apiClient = ThemisApiClient(tokenManager: tm);
    final surveyClient = SurveyApiClient(baseUrl: apiBaseUrl, tokenManager: tm);
    try {
      await apiClient.postReportMetadata(
        orgId: pairingData.orgId,
        channel: form.channel ?? 'PDR125',
      );
      // Submit public (non-private) answers for aggregation
      if (submission.publicAnswers.isNotEmpty) {
        await surveyClient.submitPublicAnswers(
          surveyId: form.id,
          answers: submission.publicAnswers,
        );
      }
    } finally {
      apiClient.dispose();
    }
  }

  Future<void> _submitSurvey(
    SurveyFetchResult form,
    SurveySubmission submission,
  ) async {
    final tm = await ref.read(tokenManagerProvider.future);
    final client = SurveyApiClient(baseUrl: apiBaseUrl, tokenManager: tm);

    // 1. Submit public answers to server
    await client.submitPublicAnswers(
      surveyId: submission.surveyId,
      answers: submission.publicAnswers,
    );

    // 2. Send private answers via Styx E2E encryption
    if (submission.hasPrivateAnswers) {
      final styx = ref.read(styxServiceProvider);
      if (!styx.isInitialized) await styx.initialize();
      await styx.sendEncrypted(
        channel: 'PDR125',
        payload: {
          'type': 'survey_private_response',
          'surveyId': submission.surveyId,
          'version': submission.version,
          'answers': submission.privateAnswers,
        },
      );
    }
  }

  Uint8List _hexToBytes(String hex) {
    final bytes = Uint8List(hex.length ~/ 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i ~/ 2] = int.parse(hex.substring(i, i + 2), radix: 16);
    }
    return bytes;
  }
}

final formSubmitNotifierProvider =
    AsyncNotifierProvider<FormSubmitNotifier, void>(FormSubmitNotifier.new);
