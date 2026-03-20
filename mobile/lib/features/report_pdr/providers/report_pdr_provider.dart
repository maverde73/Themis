import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:styx_crypto_core/styx_crypto_core.dart';

import '../../../core/crypto/report_encryptor.dart';
import '../../../core/network/api_client.dart';
import '../../pairing/providers/pairing_provider.dart';

/// PdR 125 report payload.
class PdrReportPayload {
  const PdrReportPayload({
    required this.category,
    required this.description,
    this.when,
    this.where,
    this.frequency,
    this.peopleInvolved,
    this.witnesses,
    this.previousReport,
    this.impact,
    this.wantsContact = false,
    this.contactInfo,
  });

  final List<String> category;
  final String description;
  final String? when;
  final String? where;
  final String? frequency;
  final String? peopleInvolved;
  final String? witnesses;
  final String? previousReport;
  final String? impact;
  final bool wantsContact;
  final String? contactInfo;

  Map<String, dynamic> toJson() => {
        'type': 'segnalazione_pdr125',
        'category': category,
        'description': description,
        if (when != null) 'when': when,
        if (where != null) 'where': where,
        if (frequency != null) 'frequency': frequency,
        if (peopleInvolved != null) 'people_involved': peopleInvolved,
        if (witnesses != null) 'witnesses': witnesses,
        if (previousReport != null) 'previous_report': previousReport,
        if (impact != null) 'impact': impact,
        'wants_contact': wantsContact,
        if (contactInfo != null) 'contact_info': contactInfo,
      };
}

/// Notifier that handles PdR 125 report submission.
class ReportPdrNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  /// Encrypts and sends a PdR 125 report.
  ///
  /// 1. Encrypt payload with RPG public key
  /// 2. Post metadata to server (channel=PDR125, category only)
  /// 3. TODO: Send encrypted blob to Nostr relay via Styx transport
  Future<void> submit(PdrReportPayload payload) async {
    state = const AsyncLoading();
    try {
      final keyStore = ref.read(keyStoreProvider);
      final pairingData = await keyStore.getPairingData();
      final keyPair = await keyStore.getKeyPair();

      if (pairingData == null || keyPair == null) {
        throw StateError('Not paired — cannot send report');
      }

      // Encrypt with RPG public key
      final encryptor = ReportEncryptor();
      final rpgPubKeyBytes = _hexToBytes(pairingData.rpgPublicKey);
      final rpgPubKey = StyxPublicKey(rpgPubKeyBytes);

      final envelope = await encryptor.encrypt(
        payload: payload.toJson(),
        recipientEd25519PublicKey: rpgPubKey,
        senderPrivateKey: keyPair.privateKey,
        senderPublicKey: keyPair.publicKey,
      );

      // TODO: Send encrypted envelope to Nostr relay via Styx transport
      // For now, log it (in production, this goes to the relay)
      final _ = envelope.toJsonString();

      // Post metadata to server (ONLY metadata, never content)
      final apiClient = ThemisApiClient();
      try {
        await apiClient.postReportMetadata(
          orgId: pairingData.orgId,
          channel: 'PDR125',
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

final reportPdrNotifierProvider =
    AsyncNotifierProvider<ReportPdrNotifier, void>(ReportPdrNotifier.new);
