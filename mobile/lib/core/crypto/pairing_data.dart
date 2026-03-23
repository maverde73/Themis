import 'dart:convert';

/// Themis-specific pairing QR data containing dual public keys.
///
/// JSON format from server:
/// ```json
/// {
///   "orgId": "uuid",
///   "rpgPublicKey": "hex-encoded-ed25519",
///   "odvPublicKey": "hex-encoded-ed25519",
///   "relayUrls": ["wss://..."]
/// }
/// ```
class ThemisPairingData {
  const ThemisPairingData({
    required this.orgId,
    required this.rpgPublicKey,
    required this.odvPublicKey,
    required this.relayUrls,
    this.pairingSecret,
  });

  factory ThemisPairingData.fromJson(String jsonString) {
    final map = jsonDecode(jsonString) as Map<String, dynamic>;
    final orgId = map['orgId'] as String?;
    final rpgKey = map['rpgPublicKey'] as String?;
    final odvKey = map['odvPublicKey'] as String?;
    final relays = map['relayUrls'] as List<dynamic>?;
    final secret = map['pairingSecret'] as String?;

    if (orgId == null || rpgKey == null || odvKey == null) {
      throw const FormatException(
        'Missing required fields: orgId, rpgPublicKey, odvPublicKey',
      );
    }

    return ThemisPairingData(
      orgId: orgId,
      rpgPublicKey: rpgKey,
      odvPublicKey: odvKey,
      relayUrls: relays?.cast<String>() ?? [],
      pairingSecret: secret,
    );
  }

  final String orgId;
  final String rpgPublicKey;
  final String odvPublicKey;
  final List<String> relayUrls;
  final String? pairingSecret;

  Map<String, dynamic> toJson() => {
        'orgId': orgId,
        'rpgPublicKey': rpgPublicKey,
        'odvPublicKey': odvPublicKey,
        'relayUrls': relayUrls,
        if (pairingSecret != null) 'pairingSecret': pairingSecret,
      };

  String toJsonString() => jsonEncode(toJson());
}
