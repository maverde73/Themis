import 'dart:convert';
import 'dart:typed_data';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:styx_crypto_core/styx_crypto_core.dart';

import 'pairing_data.dart';

/// Manages local key storage for Themis pairing state.
///
/// Stores the user's own Ed25519 keypair and the paired organization's
/// dual public keys (RPG + OdV).
class ThemisKeyStore {
  static const _keyPrivateKey = 'themis_private_key';
  static const _keyPublicKey = 'themis_public_key';
  static const _keyPairingData = 'themis_pairing_data';
  static const _keyIsPaired = 'themis_is_paired';

  final _identityManager = IdentityManager();

  /// Generates a new Ed25519 keypair and stores it locally.
  Future<StyxKeyPair> generateAndStoreKeyPair() async {
    final keyPair = await _identityManager.generate();
    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(
      _keyPrivateKey,
      base64Encode(keyPair.privateKey.bytes),
    );
    await prefs.setString(
      _keyPublicKey,
      base64Encode(keyPair.publicKey.bytes),
    );

    return keyPair;
  }

  /// Retrieves the stored keypair, or null if not generated yet.
  Future<StyxKeyPair?> getKeyPair() async {
    final prefs = await SharedPreferences.getInstance();
    final privateKeyStr = prefs.getString(_keyPrivateKey);
    final publicKeyStr = prefs.getString(_keyPublicKey);

    if (privateKeyStr == null || publicKeyStr == null) return null;

    return StyxKeyPair(
      privateKey: StyxPrivateKey(Uint8List.fromList(base64Decode(privateKeyStr))),
      publicKey: StyxPublicKey(Uint8List.fromList(base64Decode(publicKeyStr))),
    );
  }

  /// Stores pairing data from QR scan and marks as paired.
  Future<void> storePairingData(ThemisPairingData data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyPairingData, data.toJsonString());
    await prefs.setBool(_keyIsPaired, true);
  }

  /// Retrieves stored pairing data, or null if not paired.
  Future<ThemisPairingData?> getPairingData() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_keyPairingData);
    if (json == null) return null;
    return ThemisPairingData.fromJson(json);
  }

  /// Whether the device has been paired with an organization.
  Future<bool> isPaired() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyIsPaired) ?? false;
  }

  /// Clears all pairing data (for re-pairing or testing).
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyPrivateKey);
    await prefs.remove(_keyPublicKey);
    await prefs.remove(_keyPairingData);
    await prefs.remove(_keyIsPaired);
  }
}
