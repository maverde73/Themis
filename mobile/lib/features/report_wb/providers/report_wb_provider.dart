import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:styx_crypto_core/styx_crypto_core.dart';

import '../../../core/crypto/report_encryptor.dart';
import '../../../core/network/api_client.dart';
import '../../pairing/providers/pairing_provider.dart';

/// Whistleblowing report payload.
class WbReportPayload {
  const WbReportPayload({
    required this.violationType,
    required this.description,
    this.when,
    this.where,
    this.peopleInvolved,
    this.witnessesEvidence,
    this.previousReport,
    required this.identityRevealed,
    this.identityName,
    this.identityRole,
    this.identityContact,
    this.anonymousContact,
  });

  final List<String> violationType;
  final String description;
  final String? when;
  final String? where;
  final String? peopleInvolved;
  final String? witnessesEvidence;
  final String? previousReport;
  final bool identityRevealed;
  final String? identityName;
  final String? identityRole;
  final String? identityContact;
  final String? anonymousContact;

  Map<String, dynamic> toJson() => {
        'type': 'segnalazione_wb',
        'violation_type': violationType,
        'description': description,
        if (when != null) 'when': when,
        if (where != null) 'where': where,
        if (peopleInvolved != null) 'people_involved': peopleInvolved,
        if (witnessesEvidence != null) 'witnesses_evidence': witnessesEvidence,
        if (previousReport != null) 'previous_report': previousReport,
        'identity_revealed': identityRevealed,
        if (identityName != null) 'identity_name': identityName,
        if (identityRole != null) 'identity_role': identityRole,
        if (identityContact != null) 'identity_contact': identityContact,
        if (anonymousContact != null) 'anonymous_contact': anonymousContact,
      };
}

/// Notifier that handles WB report submission.
class ReportWbNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> submit(WbReportPayload payload) async {
    state = const AsyncLoading();
    try {
      final keyStore = ref.read(keyStoreProvider);
      final pairingData = await keyStore.getPairingData();
      final keyPair = await keyStore.getKeyPair();

      if (pairingData == null || keyPair == null) {
        throw StateError('Not paired — cannot send report');
      }

      // Encrypt with OdV public key (NOT RPG — crypto isolation)
      final encryptor = ReportEncryptor();
      final odvPubKeyBytes = _hexToBytes(pairingData.odvPublicKey);
      final odvPubKey = StyxPublicKey(odvPubKeyBytes);

      final envelope = await encryptor.encrypt(
        payload: payload.toJson(),
        recipientEd25519PublicKey: odvPubKey,
        senderPrivateKey: keyPair.privateKey,
        senderPublicKey: keyPair.publicKey,
      );

      // TODO: Send encrypted envelope to Nostr relay
      final _ = envelope.toJsonString();

      // Post metadata to server (ONLY metadata)
      final apiClient = ThemisApiClient();
      try {
        await apiClient.postReportMetadata(
          orgId: pairingData.orgId,
          channel: 'WHISTLEBLOWING',
        );
      } finally {
        apiClient.dispose();
      }

      state = const AsyncData(null);
    } catch (e, st) {
      state = AsyncError(e, st);
      rethrow;
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

final reportWbNotifierProvider =
    AsyncNotifierProvider<ReportWbNotifier, void>(ReportWbNotifier.new);
