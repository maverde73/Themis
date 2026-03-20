import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/crypto/key_store.dart';
import '../../../core/crypto/pairing_data.dart';

final keyStoreProvider = Provider<ThemisKeyStore>((ref) => ThemisKeyStore());

final isPairedProvider = FutureProvider<bool>((ref) async {
  final keyStore = ref.read(keyStoreProvider);
  return keyStore.isPaired();
});

final pairingDataProvider = FutureProvider<ThemisPairingData?>((ref) async {
  final keyStore = ref.read(keyStoreProvider);
  return keyStore.getPairingData();
});

/// Notifier that handles the pairing flow.
class PairingNotifier extends AsyncNotifier<bool> {
  @override
  Future<bool> build() async {
    final keyStore = ref.read(keyStoreProvider);
    return keyStore.isPaired();
  }

  /// Process a scanned QR code payload.
  ///
  /// Parses the JSON, generates a local keypair if needed,
  /// and stores the pairing data.
  Future<void> processQrCode(String qrPayload) async {
    state = const AsyncLoading();
    try {
      final data = ThemisPairingData.fromJson(qrPayload);
      final keyStore = ref.read(keyStoreProvider);

      // Generate keypair if not already generated
      final existingKeyPair = await keyStore.getKeyPair();
      if (existingKeyPair == null) {
        await keyStore.generateAndStoreKeyPair();
      }

      await keyStore.storePairingData(data);
      state = const AsyncData(true);
    } catch (e) {
      state = AsyncError(e, StackTrace.current);
    }
  }

  /// Clear pairing data (for re-pairing).
  Future<void> unpair() async {
    final keyStore = ref.read(keyStoreProvider);
    await keyStore.clearAll();
    state = const AsyncData(false);
  }
}

final pairingNotifierProvider =
    AsyncNotifierProvider<PairingNotifier, bool>(PairingNotifier.new);
